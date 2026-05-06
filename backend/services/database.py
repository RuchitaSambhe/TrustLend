"""
TrustLend Database Layer - DynamoDB in production, in-memory dict in mock mode.
"""

import logging
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

# In-memory store for mock mode
_memory_store: dict[str, dict] = {}


class ApplicationDB:
    """Handles application persistence via DynamoDB or in-memory fallback."""

    def __init__(self):
        self._table = None
        if not settings.MOCK_MODE:
            try:
                import boto3
                dynamodb = boto3.resource("dynamodb", region_name=settings.AWS_REGION)
                self._table = dynamodb.Table(settings.DYNAMODB_TABLE)
                logger.info(f"Connected to DynamoDB table: {settings.DYNAMODB_TABLE}")
            except Exception as e:
                logger.warning(f"DynamoDB init failed: {e}. Using in-memory store.")

    def save(self, app_dict: dict) -> None:
        """Save an application record."""
        app_id = app_dict.get("application_id", "")

        # Always save to memory as backup
        _memory_store[app_id] = app_dict

        if self._table and not settings.MOCK_MODE:
            try:
                # DynamoDB doesn't support float, convert to Decimal-safe format
                item = self._sanitize_for_dynamo(app_dict)
                self._table.put_item(Item=item)
            except Exception as e:
                logger.warning(f"DynamoDB save failed: {e}. Data is in memory store.")

    def get(self, app_id: str) -> Optional[dict]:
        """Retrieve an application by ID."""
        if self._table and not settings.MOCK_MODE:
            try:
                response = self._table.get_item(Key={"application_id": app_id})
                item = response.get("Item")
                if item:
                    return item
                # Fall through to memory check if not found in DynamoDB
            except Exception as e:
                logger.warning(f"DynamoDB get failed: {e}. Falling back to memory.")

        return _memory_store.get(app_id)

    def list_all(self) -> list[dict]:
        """List all applications."""
        results = list(_memory_store.values())
        if self._table and not settings.MOCK_MODE:
            try:
                response = self._table.scan()
                dynamo_items = response.get("Items", [])
                # Merge: DynamoDB items + memory items not in DynamoDB
                dynamo_ids = {item.get("application_id") for item in dynamo_items}
                results = dynamo_items + [
                    app for app in _memory_store.values()
                    if app.get("application_id") not in dynamo_ids
                ]
            except Exception as e:
                logger.warning(f"DynamoDB scan failed: {e}. Using memory store only.")

        return results

    def _sanitize_for_dynamo(self, obj: dict) -> dict:
        """Convert floats to strings for DynamoDB compatibility."""
        import json
        from decimal import Decimal

        # Serialize to JSON and back with Decimal conversion
        json_str = json.dumps(obj, default=str)
        return json.loads(json_str, parse_float=Decimal)
