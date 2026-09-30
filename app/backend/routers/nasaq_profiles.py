import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nasaq_profiles import Nasaq_profilesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nasaq_profiles", tags=["nasaq_profiles"])


# ---------- Pydantic Schemas ----------
class Nasaq_profilesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str = None
    email: str = None
    phone: str = None
    company: str = None
    industry: str = None
    city: str = None
    plan: str = None
    trial_ends: str = None
    onboarded: bool = None
    brand_json: str = None


class Nasaq_profilesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    plan: Optional[str] = None
    trial_ends: Optional[str] = None
    onboarded: Optional[bool] = None
    brand_json: Optional[str] = None


class Nasaq_profilesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    plan: Optional[str] = None
    trial_ends: Optional[str] = None
    onboarded: Optional[bool] = None
    brand_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Nasaq_profilesListResponse(BaseModel):
    """List response schema"""
    items: List[Nasaq_profilesResponse]
    total: int
    skip: int
    limit: int


class Nasaq_profilesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nasaq_profilesData]


class Nasaq_profilesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nasaq_profilesUpdateData


class Nasaq_profilesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nasaq_profilesBatchUpdateItem]


class Nasaq_profilesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nasaq_profilesListResponse)
async def query_nasaq_profiless(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query nasaq_profiless with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nasaq_profiless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nasaq_profilesService(db)
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
        logger.debug(f"Found {result['total']} nasaq_profiless")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_profiles query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_profiless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Nasaq_profilesListResponse)
async def query_nasaq_profiless_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query nasaq_profiless with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying nasaq_profiless: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Nasaq_profilesService(db)
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
        logger.debug(f"Found {result['total']} nasaq_profiless")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_profiles query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_profiless: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nasaq_profilesResponse)
async def get_nasaq_profiles(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nasaq_profiles by ID (user can only see their own records)"""
    logger.debug(f"Fetching nasaq_profiles with id: {id}, fields={fields}")
    
    service = Nasaq_profilesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_profiles with id {id} not found")
            raise HTTPException(status_code=404, detail="Nasaq_profiles not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nasaq_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nasaq_profilesResponse, status_code=201)
async def create_nasaq_profiles(
    data: Nasaq_profilesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nasaq_profiles"""
    logger.debug(f"Creating new nasaq_profiles with data: {data}")
    
    service = Nasaq_profilesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nasaq_profiles")
        
        logger.info(f"Nasaq_profiles created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nasaq_profiles: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nasaq_profiles: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nasaq_profilesResponse], status_code=201)
async def create_nasaq_profiless_batch(
    request: Nasaq_profilesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nasaq_profiless in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nasaq_profiless")
    
    service = Nasaq_profilesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nasaq_profiless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nasaq_profilesResponse])
async def update_nasaq_profiless_batch(
    request: Nasaq_profilesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nasaq_profiless in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nasaq_profiless")
    
    service = Nasaq_profilesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nasaq_profiless successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nasaq_profilesResponse)
async def update_nasaq_profiles(
    id: int,
    data: Nasaq_profilesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nasaq_profiles (requires ownership)"""
    logger.debug(f"Updating nasaq_profiles {id} with data: {data}")

    service = Nasaq_profilesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_profiles with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nasaq_profiles not found")
        
        logger.info(f"Nasaq_profiles {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nasaq_profiles {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nasaq_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nasaq_profiless_batch(
    request: Nasaq_profilesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nasaq_profiless by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nasaq_profiless")
    
    service = Nasaq_profilesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nasaq_profiless successfully")
        return {"message": f"Successfully deleted {deleted_count} nasaq_profiless", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nasaq_profiles(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nasaq_profiles by ID (requires ownership)"""
    logger.debug(f"Deleting nasaq_profiles with id: {id}")
    
    service = Nasaq_profilesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Nasaq_profiles with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nasaq_profiles not found")
        
        logger.info(f"Nasaq_profiles {id} deleted successfully")
        return {"message": "Nasaq_profiles deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nasaq_profiles {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")