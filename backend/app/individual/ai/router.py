import json
from datetime import datetime
from typing import AsyncGenerator, Optional
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
import google.generativeai as genai
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.config import settings
from app.individual.ai.tools.financial_tools import TOOL_DEFINITIONS, TOOL_FUNCTIONS

router = APIRouter(prefix="/ai", tags=["Individual - AI Advisor"])

# Configure Gemini
genai.configure(api_key=settings.LLM_API_KEY)

SYSTEM_PROMPT = """You are a professional AI Financial Advisor for an Indian individual user.

Your role:
- Answer questions about the user's personal finances using ONLY data from the provided tools
- Give clear, actionable financial advice based on real data
- Use Indian financial context (₹, Indian tax laws, Indian markets)
- Distinguish between actual data, estimates, projections, and assumptions
- Never guarantee investment returns
- Be concise but thorough

Available tools let you access:
- Financial summary (income, expenses, savings)
- Expense breakdown by category and month
- Income sources
- Investment portfolio
- Estimated credit health (NOT official CIBIL score)
- Financial Health Score
- Financial goals

Important rules:
- Always use tools to fetch real data before answering financial questions
- Label projections as "projected" or "estimated"
- For official credit scores, clarify this is an estimated health score, not CIBIL
- Be empathetic but honest about financial situations
- Format numbers in Indian format (use ₹ symbol, use lakhs/crores for large numbers)
"""


def format_inr(amount: float) -> str:
    """Format number in Indian numbering system."""
    if amount >= 10_000_000:
        return f"₹{amount/10_000_000:.2f} Cr"
    elif amount >= 100_000:
        return f"₹{amount/100_000:.2f} L"
    else:
        return f"₹{amount:,.0f}"


class SendMessageRequest(BaseModel):
    content: str
    conversation_id: Optional[str] = None


@router.get("/conversations")
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    cursor = db.ai_conversations.find(
        {"user_id": current_user["_id"]}
    ).sort("updated_at", -1).limit(20)
    convs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        convs.append(doc)
    return convs


@router.post("/conversations")
async def create_conversation(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    now = datetime.utcnow()
    doc = {
        "user_id": current_user["_id"],
        "title": "New Conversation",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.ai_conversations.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    # Verify conversation belongs to user
    conv = await db.ai_conversations.find_one(
        {"_id": ObjectId(conversation_id), "user_id": current_user["_id"]}
    )
    if not conv:
        from app.utils.exceptions import not_found
        raise not_found("Conversation")

    cursor = db.ai_messages.find(
        {"conversation_id": conversation_id}
    ).sort("created_at", 1)
    messages = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        messages.append(doc)
    return messages


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Send a message to the AI advisor.
    Uses Gemini function calling to fetch real financial data.
    Returns streaming response.
    """
    # Verify conversation
    conv = await db.ai_conversations.find_one(
        {"_id": ObjectId(conversation_id), "user_id": current_user["_id"]}
    )
    if not conv:
        from app.utils.exceptions import not_found
        raise not_found("Conversation")

    # Save user message
    now = datetime.utcnow()
    await db.ai_messages.insert_one({
        "conversation_id": conversation_id,
        "user_id": current_user["_id"],
        "role": "USER",
        "content": request.content,
        "created_at": now,
    })

    # Update conversation title if first message
    msg_count = await db.ai_messages.count_documents({"conversation_id": conversation_id})
    if msg_count <= 2:
        title = request.content[:60] + ("..." if len(request.content) > 60 else "")
        await db.ai_conversations.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"title": title, "updated_at": now}},
        )

    # Load conversation history
    history_cursor = db.ai_messages.find(
        {"conversation_id": conversation_id, "role": {"$in": ["USER", "ASSISTANT"]}}
    ).sort("created_at", 1).limit(20)
    history = [doc async for doc in history_cursor]

    async def generate() -> AsyncGenerator[str, None]:
        try:
            model = genai.GenerativeModel(
                model_name=settings.LLM_MODEL,
                system_instruction=SYSTEM_PROMPT,
                tools=[{"function_declarations": TOOL_DEFINITIONS}],
            )

            # Build chat history
            chat_history = []
            for msg in history[:-1]:  # exclude the message we just added
                role = "user" if msg["role"] == "USER" else "model"
                chat_history.append({"role": role, "parts": [msg["content"]]})

            chat = model.start_chat(history=chat_history)

            # Send message and handle function calling loop
            response = chat.send_message(request.content)
            full_response = ""

            # Process function calls
            function_calls_count = 0
            MAX_CALLS = 5
            
            while function_calls_count < MAX_CALLS:
                has_func = False
                if response.candidates and response.candidates[0].content.parts:
                    part = response.candidates[0].content.parts[0]
                    # In python protobuf, function_call.name is truthy if populated
                    if hasattr(part, "function_call") and part.function_call and getattr(part.function_call, "name", ""):
                        has_func = True
                        fn_name = part.function_call.name
                        fn_args = dict(part.function_call.args) if part.function_call.args else {}

                        # Add user_id to tool calls
                        fn_args["user_id"] = current_user["_id"]

                        # Execute tool
                        tool_fn = TOOL_FUNCTIONS.get(fn_name)
                        if tool_fn:
                            try:
                                tool_result = await tool_fn(**fn_args)
                            except Exception as e:
                                tool_result = {"error": str(e)}
                        else:
                            tool_result = {"error": f"Unknown tool: {fn_name}"}

                        # Send tool result back
                        response = chat.send_message(
                            genai.protos.Part(
                                function_response=genai.protos.FunctionResponse(
                                    name=fn_name,
                                    response={"result": json.dumps(tool_result, default=str)[:3000]},
                                )
                            )
                        )
                        function_calls_count += 1
                        
                if not has_func:
                    break

            try:
                full_response = response.text
            except Exception:
                # If response.text fails, fallback to extracting it manually
                if response.candidates and response.candidates[0].content.parts:
                    full_response = response.candidates[0].content.parts[0].text
                else:
                    full_response = ""

            if not full_response:
                full_response = "I processed your request successfully but have no further information."

            # Stream the response text
            chunk_size = 5
            for i in range(0, len(full_response), chunk_size):
                yield full_response[i:i+chunk_size]

            # Save assistant response
            await db.ai_messages.insert_one({
                "conversation_id": conversation_id,
                "user_id": current_user["_id"],
                "role": "ASSISTANT",
                "content": full_response,
                "created_at": datetime.utcnow(),
            })

            await db.ai_conversations.update_one(
                {"_id": ObjectId(conversation_id)},
                {"$set": {"updated_at": datetime.utcnow()}},
            )

        except Exception as e:
            error_msg = f"I encountered an error processing your request: {str(e)}"
            yield error_msg
            await db.ai_messages.insert_one({
                "conversation_id": conversation_id,
                "user_id": current_user["_id"],
                "role": "ASSISTANT",
                "content": error_msg,
                "created_at": datetime.utcnow(),
            })

    return StreamingResponse(generate(), media_type="text/plain")


@router.get("/quick-chat")
async def quick_chat(
    q: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Quick one-off question without conversation history."""
    try:
        model = genai.GenerativeModel(
            model_name=settings.LLM_MODEL,
            system_instruction=SYSTEM_PROMPT,
            tools=[{"function_declarations": TOOL_DEFINITIONS}],
        )

        response = model.generate_content(q)
        text = response.text if hasattr(response, "text") else "I could not process your request."
        return {"response": text}
    except Exception as e:
        return {"response": f"Error: {str(e)}", "error": True}
