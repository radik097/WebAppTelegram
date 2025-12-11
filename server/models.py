"""
Database models for PremiumHatStore
This file provides SQLAlchemy models for future database implementation
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model for storing Telegram user information"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    language_code = Column(String, nullable=True)
    balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    spins = relationship("Spin", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    gifts = relationship("Gift", back_populates="user")


class Spin(Base):
    """Spin model for storing slot game results"""
    __tablename__ = "spins"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bet_amount = Column(Float, nullable=False)
    dice_value = Column(Integer, nullable=False)
    symbols = Column(JSON, nullable=False)  # ["bar", "lemon", "grape"]
    is_win = Column(Boolean, default=False)
    is_jackpot = Column(Boolean, default=False)
    win_amount = Column(Float, default=0.0)
    telegram_message_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="spins")


class Transaction(Base):
    """Transaction model for tracking payments and payouts"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_type = Column(String, nullable=False)  # 'deposit', 'withdrawal', 'win', 'bet'
    amount = Column(Float, nullable=False)
    currency = Column(String, default="XTR")  # Telegram Stars
    description = Column(String, nullable=True)
    telegram_payment_id = Column(String, nullable=True, unique=True)
    status = Column(String, default="pending")  # 'pending', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="transactions")


class Gift(Base):
    """Gift model for storing user gifts/rewards"""
    __tablename__ = "gifts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    gift_type = Column(String, nullable=False)  # 'daily', 'achievement', 'purchase'
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    rarity = Column(String, default="common")  # 'common', 'rare', 'epic', 'legendary'
    claimed = Column(Boolean, default=False)
    claimed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="gifts")


class Battle(Base):
    """Battle model for PvP battles"""
    __tablename__ = "battles"
    
    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    opponent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    bet_amount = Column(Float, nullable=False)
    status = Column(String, default="waiting")  # 'waiting', 'active', 'completed', 'cancelled'
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator_result = Column(JSON, nullable=True)
    opponent_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class JackpotEntry(Base):
    """Jackpot entry model for jackpot game"""
    __tablename__ = "jackpot_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    jackpot_round_id = Column(Integer, ForeignKey("jackpot_rounds.id"), nullable=False)
    bet_amount = Column(Float, nullable=False)
    tickets = Column(Integer, nullable=False)  # Number of tickets based on bet
    created_at = Column(DateTime, default=datetime.utcnow)


class JackpotRound(Base):
    """Jackpot round model"""
    __tablename__ = "jackpot_rounds"
    
    id = Column(Integer, primary_key=True, index=True)
    total_pool = Column(Float, default=0.0)
    status = Column(String, default="active")  # 'active', 'drawing', 'completed'
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    winning_ticket = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
