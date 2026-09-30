import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.nasaq_workspaces import Nasaq_workspacesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/nasaq_workspaces", tags=["nasaq_workspaces"])


# ---------- Pydantic Schemas ----------
class Nasaq_workspacesData(BaseModel):
    """Entity data schema (for create/update)"""
    data_json: str = None


class Nasaq_workspacesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    data_json: Optional[str] = None


class Nasaq_workspacesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    data_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Nasaq_workspacesListResponse(BaseModel):
    """List response schema"""
    items: List[Nasaq_workspacesResponse]
    total: int
    skip: int
    limit: int


class Nasaq_workspacesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Nasaq_workspacesData]


class Nasaq_workspacesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Nasaq_workspacesUpdateData


class Nasaq_workspacesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Nasaq_workspacesBatchUpdateItem]


class Nasaq_workspacesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Nasaq_workspacesListResponse)
async def query_nasaq_workspacess(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query nasaq_workspacess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying nasaq_workspacess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Nasaq_workspacesService(db)
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
        logger.debug(f"Found {result['total']} nasaq_workspacess")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_workspaces query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_workspacess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Nasaq_workspacesListResponse)
async def query_nasaq_workspacess_all(
    query: str = Query(None, description='Query conditions as JSON, e.g. {"id":2} or {"id":{"$gte":2}}'),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query nasaq_workspacess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying nasaq_workspacess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Nasaq_workspacesService(db)
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
        logger.debug(f"Found {result['total']} nasaq_workspacess")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid nasaq_workspaces query: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error querying nasaq_workspacess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Nasaq_workspacesResponse)
async def get_nasaq_workspaces(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single nasaq_workspaces by ID (user can only see their own records)"""
    logger.debug(f"Fetching nasaq_workspaces with id: {id}, fields={fields}")
    
    service = Nasaq_workspacesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_workspaces with id {id} not found")
            raise HTTPException(status_code=404, detail="Nasaq_workspaces not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching nasaq_workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Nasaq_workspacesResponse, status_code=201)
async def create_nasaq_workspaces(
    data: Nasaq_workspacesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new nasaq_workspaces"""
    logger.debug(f"Creating new nasaq_workspaces with data: {data}")
    
    service = Nasaq_workspacesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create nasaq_workspaces")
        
        logger.info(f"Nasaq_workspaces created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating nasaq_workspaces: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating nasaq_workspaces: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Nasaq_workspacesResponse], status_code=201)
async def create_nasaq_workspacess_batch(
    request: Nasaq_workspacesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple nasaq_workspacess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} nasaq_workspacess")
    
    service = Nasaq_workspacesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} nasaq_workspacess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Nasaq_workspacesResponse])
async def update_nasaq_workspacess_batch(
    request: Nasaq_workspacesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple nasaq_workspacess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} nasaq_workspacess")
    
    service = Nasaq_workspacesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} nasaq_workspacess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Nasaq_workspacesResponse)
async def update_nasaq_workspaces(
    id: int,
    data: Nasaq_workspacesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing nasaq_workspaces (requires ownership)"""
    logger.debug(f"Updating nasaq_workspaces {id} with data: {data}")

    service = Nasaq_workspacesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Nasaq_workspaces with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Nasaq_workspaces not found")
        
        logger.info(f"Nasaq_workspaces {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating nasaq_workspaces {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating nasaq_workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_nasaq_workspacess_batch(
    request: Nasaq_workspacesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple nasaq_workspacess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} nasaq_workspacess")
    
    service = Nasaq_workspacesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} nasaq_workspacess successfully")
        return {"message": f"Successfully deleted {deleted_count} nasaq_workspacess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_nasaq_workspaces(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single nasaq_workspaces by ID (requires ownership)"""
    logger.debug(f"Deleting nasaq_workspaces with id: {id}")
    
    service = Nasaq_workspacesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Nasaq_workspaces with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Nasaq_workspaces not found")
        
        logger.info(f"Nasaq_workspaces {id} deleted successfully")
        return {"message": "Nasaq_workspaces deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting nasaq_workspaces {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")