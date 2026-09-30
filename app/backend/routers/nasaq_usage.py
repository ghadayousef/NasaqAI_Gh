import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nasaq_usage import Nasaq_usageService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nasaq_usage", tags=["nasaq_usage"])


# ---------- Pydantic Schemas ----------
class Nasaq_usageData(BaseModel):
    """Entity data schema (for create/update)"""
    month: str
    gens: int = None


class Nasaq_usageUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    month: Optional[str] = None
    gens: Optional[int] = None


class Nasaq_usageResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    month: str
    gens: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Nasaq_usageListResponse(BaseModel):
    """List response schema"""
    items: List[Nasaq_usageResponse]
    total: int
    skip: int
    limit: int


class Nasaq_usageBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nasaq_usageData]


class Nasaq_usageBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nasaq_usageUpdateData


class Nasaq_usageBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nasaq_usageBatchUpdateItem]


class Nasaq_usageBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nasaq_usageListResponse)
async def query_nasaq_usages(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query nasaq_usages with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nasaq_usages: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nasaq_usageService(db)
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
        logger.debug(f"Found {result['total']} nasaq_usages")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_usage query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_usages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Nasaq_usageListResponse)
async def query_nasaq_usages_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query nasaq_usages with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying nasaq_usages: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Nasaq_usageService(db)
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
        logger.debug(f"Found {result['total']} nasaq_usages")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_usage query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_usages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nasaq_usageResponse)
async def get_nasaq_usage(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nasaq_usage by ID (user can only see their own records)"""
    logger.debug(f"Fetching nasaq_usage with id: {id}, fields={fields}")
    
    service = Nasaq_usageService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_usage with id {id} not found")
            raise HTTPException(status_code=404, detail="Nasaq_usage not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nasaq_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nasaq_usageResponse, status_code=201)
async def create_nasaq_usage(
    data: Nasaq_usageData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nasaq_usage"""
    logger.debug(f"Creating new nasaq_usage with data: {data}")
    
    service = Nasaq_usageService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nasaq_usage")
        
        logger.info(f"Nasaq_usage created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nasaq_usage: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nasaq_usage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nasaq_usageResponse], status_code=201)
async def create_nasaq_usages_batch(
    request: Nasaq_usageBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nasaq_usages in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nasaq_usages")
    
    service = Nasaq_usageService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nasaq_usages successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nasaq_usageResponse])
async def update_nasaq_usages_batch(
    request: Nasaq_usageBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nasaq_usages in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nasaq_usages")
    
    service = Nasaq_usageService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nasaq_usages successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nasaq_usageResponse)
async def update_nasaq_usage(
    id: int,
    data: Nasaq_usageUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nasaq_usage (requires ownership)"""
    logger.debug(f"Updating nasaq_usage {id} with data: {data}")

    service = Nasaq_usageService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_usage with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nasaq_usage not found")
        
        logger.info(f"Nasaq_usage {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nasaq_usage {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nasaq_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nasaq_usages_batch(
    request: Nasaq_usageBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nasaq_usages by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nasaq_usages")
    
    service = Nasaq_usageService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nasaq_usages successfully")
        return {"message": f"Successfully deleted {deleted_count} nasaq_usages", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nasaq_usage(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nasaq_usage by ID (requires ownership)"""
    logger.debug(f"Deleting nasaq_usage with id: {id}")
    
    service = Nasaq_usageService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Nasaq_usage with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nasaq_usage not found")
        
        logger.info(f"Nasaq_usage {id} deleted successfully")
        return {"message": "Nasaq_usage deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nasaq_usage {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")