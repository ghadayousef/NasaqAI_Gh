import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nasaq_wa_messages import Nasaq_wa_messagesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nasaq_wa_messages", tags=["nasaq_wa_messages"])


# ---------- Pydantic Schemas ----------
class Nasaq_wa_messagesData(BaseModel):
    """Entity data schema (for create/update)"""
    contact_phone: str
    contact_name: str = None
    direction: str
    text: str = None
    ai: bool = None
    wa_message_id: str = None
    status: str = None


class Nasaq_wa_messagesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    contact_phone: Optional[str] = None
    contact_name: Optional[str] = None
    direction: Optional[str] = None
    text: Optional[str] = None
    ai: Optional[bool] = None
    wa_message_id: Optional[str] = None
    status: Optional[str] = None


class Nasaq_wa_messagesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    contact_phone: str
    contact_name: Optional[str] = None
    direction: str
    text: Optional[str] = None
    ai: Optional[bool] = None
    wa_message_id: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Nasaq_wa_messagesListResponse(BaseModel):
    """List response schema"""
    items: List[Nasaq_wa_messagesResponse]
    total: int
    skip: int
    limit: int


class Nasaq_wa_messagesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nasaq_wa_messagesData]


class Nasaq_wa_messagesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nasaq_wa_messagesUpdateData


class Nasaq_wa_messagesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nasaq_wa_messagesBatchUpdateItem]


class Nasaq_wa_messagesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nasaq_wa_messagesListResponse)
async def query_nasaq_wa_messagess(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query nasaq_wa_messagess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nasaq_wa_messagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nasaq_wa_messagesService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} nasaq_wa_messagess")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_wa_messages query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_wa_messagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Nasaq_wa_messagesListResponse)
async def query_nasaq_wa_messagess_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query nasaq_wa_messagess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying nasaq_wa_messagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Nasaq_wa_messagesService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} nasaq_wa_messagess")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_wa_messages query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_wa_messagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nasaq_wa_messagesResponse)
async def get_nasaq_wa_messages(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nasaq_wa_messages by ID (user can only see their own records)"""
    logger.debug(f"Fetching nasaq_wa_messages with id: {id}, fields={fields}")
    
    service = Nasaq_wa_messagesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_wa_messages with id {id} not found")
            raise HTTPException(status_code=404, detail="Nasaq_wa_messages not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nasaq_wa_messages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nasaq_wa_messagesResponse, status_code=201)
async def create_nasaq_wa_messages(
    data: Nasaq_wa_messagesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nasaq_wa_messages"""
    logger.debug(f"Creating new nasaq_wa_messages with data: {data}")
    
    service = Nasaq_wa_messagesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nasaq_wa_messages")
        
        logger.info(f"Nasaq_wa_messages created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nasaq_wa_messages: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nasaq_wa_messages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nasaq_wa_messagesResponse], status_code=201)
async def create_nasaq_wa_messagess_batch(
    request: Nasaq_wa_messagesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nasaq_wa_messagess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nasaq_wa_messagess")
    
    service = Nasaq_wa_messagesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nasaq_wa_messagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nasaq_wa_messagesResponse])
async def update_nasaq_wa_messagess_batch(
    request: Nasaq_wa_messagesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nasaq_wa_messagess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nasaq_wa_messagess")
    
    service = Nasaq_wa_messagesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nasaq_wa_messagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nasaq_wa_messagesResponse)
async def update_nasaq_wa_messages(
    id: int,
    data: Nasaq_wa_messagesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nasaq_wa_messages (requires ownership)"""
    logger.debug(f"Updating nasaq_wa_messages {id} with data: {data}")

    service = Nasaq_wa_messagesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_wa_messages with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nasaq_wa_messages not found")
        
        logger.info(f"Nasaq_wa_messages {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nasaq_wa_messages {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nasaq_wa_messages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nasaq_wa_messagess_batch(
    request: Nasaq_wa_messagesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nasaq_wa_messagess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nasaq_wa_messagess")
    
    service = Nasaq_wa_messagesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nasaq_wa_messagess successfully")
        return {"message": f"Successfully deleted {deleted_count} nasaq_wa_messagess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nasaq_wa_messages(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nasaq_wa_messages by ID (requires ownership)"""
    logger.debug(f"Deleting nasaq_wa_messages with id: {id}")
    
    service = Nasaq_wa_messagesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Nasaq_wa_messages with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nasaq_wa_messages not found")
        
        logger.info(f"Nasaq_wa_messages {id} deleted successfully")
        return {"message": "Nasaq_wa_messages deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nasaq_wa_messages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")