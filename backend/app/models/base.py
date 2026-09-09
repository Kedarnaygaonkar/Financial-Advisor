"""Shared base models and type utilities for MongoDB documents."""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: dict[str, Any]):
        field_schema.update(type="string")
        return field_schema


class MongoBaseModel(BaseModel):
    """Base model for all MongoDB documents."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
    }


def utcnow() -> datetime:
    return datetime.utcnow()
