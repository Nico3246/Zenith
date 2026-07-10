from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.application.auth_service import DuplicateUserError, InvalidRefreshTokenError, auth_service
from app.core.config import get_settings
from app.core.rate_limit import RateLimitExceededError, check_rate_limit
from app.domain.users import LoginRequest, LogoutRequest, RefreshTokenRequest, TokenResponse, UserCreate, UserRead
from app.infrastructure.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def client_host(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def raise_rate_limited() -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many attempts. Try again later.",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(data: UserCreate, request: Request, db: Annotated[Session, Depends(get_db)]):
    settings = get_settings()
    try:
        check_rate_limit(
            key=f"register:{client_host(request)}",
            limit=settings.auth_register_rate_limit_attempts,
            window_seconds=settings.auth_register_rate_limit_window_seconds,
        )
    except RateLimitExceededError:
        raise_rate_limited()

    try:
        return auth_service.register_user(db, data)
    except DuplicateUserError as error:
        field = str(error)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with this {field} already exists.",
        ) from error


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    settings = get_settings()
    try:
        check_rate_limit(
            key=f"login:{client_host(request)}:{str(data.email).lower()}",
            limit=settings.auth_login_rate_limit_attempts,
            window_seconds=settings.auth_login_rate_limit_window_seconds,
        )
    except RateLimitExceededError:
        raise_rate_limited()

    user = auth_service.authenticate_user(db, str(data.email), data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_pair = auth_service.create_token_pair(db, user)
    return TokenResponse(access_token=token_pair.access_token, refresh_token=token_pair.refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshTokenRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    try:
        token_pair = auth_service.refresh_token_pair(db, data.refresh_token)
    except InvalidRefreshTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    return TokenResponse(access_token=token_pair.access_token, refresh_token=token_pair.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: LogoutRequest, db: Annotated[Session, Depends(get_db)]) -> None:
    auth_service.revoke_refresh_token(db, data.refresh_token)
