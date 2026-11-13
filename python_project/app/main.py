"""
Punto de entrada FastAPI para SEFI-TI (Sistema de Evaluación Financiera y Turnos Inteligentes).
Cliente Piloto: Urban Style Barber Shop (Medellín).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router


app = FastAPI(
    title="SEFI-TI · Urban Style Barber Shop API",
    description="Motor de Evaluación Financiera (VAN, TIR Newton-Raphson, Bisección) y Gestión de Turnos con Arquitectura Hexagonal.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SEFI-TI Hexagonal Backend"}
