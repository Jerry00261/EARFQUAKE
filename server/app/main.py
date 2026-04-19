from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.db.mongo import close_mongo


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Load ML artifacts in a thread so we don't block the event loop
    # ROM SVD + RBF fit takes a few seconds — do it once here
    await asyncio.get_event_loop().run_in_executor(None, _load_ml)
    yield
    close_mongo()


def _load_ml():
    """Trigger module-level initialization of ROM and classifier."""
    from app.ml import rom, model  # noqa: F401 — imports run the loading code
    print("ML artifacts loaded.")


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend API for the earthquake visualization dashboard.",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"message": f"{settings.app_name} is running"}

    application.include_router(api_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()