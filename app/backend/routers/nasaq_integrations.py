import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nasaq_integrations import Nasaq_integrationsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nasaq_integrations", tags=["nasaq_integrations"])


# ---------- Pydantic Schemas ----------
class Nasaq_integrationsData(BaseModel):
    """Entity data schema (for create/update)"""
    provider: str
    account_name: str = None
    external_id: str = None
    access_token: str = None
    status: str = None
    verify_token: str = None
    auto_reply: bool = None


class Nasaq_integrationsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    provider: Optional[str] = None
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    access_token: Optional[str] = None
    status: Optional[str] = None
    verify_token: Optional[str] = None
    auto_reply: Optional[bool] = None


class Nasaq_integrationsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    provider: str
    account_name: Optional[str] = None
    external_id: Optional[str] = None
    access_token: Optional[str] = None
    status: Optional[str] = None
    verify_token: Optional[str] = None
    auto_reply: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Nasaq_integrationsListResponse(BaseModel):
    """List response schema"""
    items: List[Nasaq_integrationsResponse]
    total: int
    skip: int
    limit: int


class Nasaq_integrationsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nasaq_integrationsData]


class Nasaq_integrationsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nasaq_integrationsUpdateData


class Nasaq_integrationsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nasaq_integrationsBatchUpdateItem]


class Nasaq_integrationsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nasaq_integrationsListResponse)
async def query_nasaq_integrationss(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query nasaq_integrationss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nasaq_integrationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nasaq_integrationsService(db)
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
        logger.debug(f"Found {result['total']} nasaq_integrationss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_integrations query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_integrationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Nasaq_integrationsListResponse)
async def query_nasaq_integrationss_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query nasaq_integrationss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying nasaq_integrationss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Nasaq_integrationsService(db)
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
        logger.debug(f"Found {result['total']} nasaq_integrationss")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_integrations query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_integrationss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nasaq_integrationsResponse)
async def get_nasaq_integrations(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nasaq_integrations by ID (user can only see their own records)"""
    logger.debug(f"Fetching nasaq_integrations with id: {id}, fields={fields}")
    
    service = Nasaq_integrationsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_integrations with id {id} not found")
            raise HTTPException(status_code=404, detail="Nasaq_integrations not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nasaq_integrations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nasaq_integrationsResponse, status_code=201)
async def create_nasaq_integrations(
    data: Nasaq_integrationsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nasaq_integrations"""
    logger.debug(f"Creating new nasaq_integrations with data: {data}")
    
    service = Nasaq_integrationsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nasaq_integrations")
        
        logger.info(f"Nasaq_integrations created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nasaq_integrations: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nasaq_integrations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nasaq_integrationsResponse], status_code=201)
async def create_nasaq_integrationss_batch(
    request: Nasaq_integrationsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nasaq_integrationss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nasaq_integrationss")
    
    service = Nasaq_integrationsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nasaq_integrationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nasaq_integrationsResponse])
async def update_nasaq_integrationss_batch(
    request: Nasaq_integrationsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nasaq_integrationss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nasaq_integrationss")
    
    service = Nasaq_integrationsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nasaq_integrationss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nasaq_integrationsResponse)
async def update_nasaq_integrations(
    id: int,
    data: Nasaq_integrationsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nasaq_integrations (requires ownership)"""
    logger.debug(f"Updating nasaq_integrations {id} with data: {data}")

    service = Nasaq_integrationsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_integrations with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nasaq_integrations not found")
        
        logger.info(f"Nasaq_integrations {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nasaq_integrations {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nasaq_integrations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nasaq_integrationss_batch(
    request: Nasaq_integrationsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nasaq_integrationss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nasaq_integrationss")
    
    service = Nasaq_integrationsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nasaq_integrationss successfully")
        return {"message": f"Successfully deleted {deleted_count} nasaq_integrationss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nasaq_integrations(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nasaq_integrations by ID (requires ownership)"""
    logger.debug(f"Deleting nasaq_integrations with id: {id}")
    
    service = Nasaq_integrationsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Nasaq_integrations with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nasaq_integrations not found")
        
        logger.info(f"Nasaq_integrations {id} deleted successfully")
        return {"message": "Nasaq_integrations deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nasaq_integrations {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")