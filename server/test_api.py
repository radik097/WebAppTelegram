"""
Test script for PremiumHatStore FastAPI Backend
Run this to test the API endpoints
"""

import httpx
import asyncio
import json
from datetime import datetime


BASE_URL = "http://localhost:5174"


async def test_status():
    """Test status endpoint"""
    print("🧪 Testing /status endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/status")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200


async def test_auth():
    """Test Telegram authentication"""
    print("\n🧪 Testing /api/auth/telegram endpoint...")
    
    auth_data = {
        "profile": {
            "id": 123456789,
            "first_name": "Test",
            "last_name": "User",
            "username": "testuser",
            "language_code": "en"
        },
        "init_data": "test_init_data"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/telegram",
            json=auth_data
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200


async def test_create_invoice():
    """Test invoice creation"""
    print("\n🧪 Testing /slots/create-invoice endpoint...")
    
    invoice_data = {
        "bet_amount": 50,
        "user_id": 123456789
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/slots/create-invoice",
                json=invoice_data,
                timeout=10.0
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            return response.status_code == 200
        except Exception as e:
            print(f"   ❌ Error: {e}")
            print("   Note: This requires a valid Telegram bot token")
            return False


async def test_send_dice():
    """Test sending slot dice"""
    print("\n🧪 Testing /api/send-slot-dice endpoint...")
    
    spin_data = {
        "userId": 123456789,
        "betAmount": 50
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/api/send-slot-dice",
                json=spin_data,
                timeout=10.0
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            return response.status_code == 200
        except Exception as e:
            print(f"   ❌ Error: {e}")
            print("   Note: This requires a valid Telegram bot token and channel ID")
            return False


async def test_docs():
    """Test API documentation"""
    print("\n🧪 Testing /docs endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/docs")
        print(f"   Status: {response.status_code}")
        print(f"   Docs available at: {BASE_URL}/docs")
        return response.status_code == 200


async def main():
    """Run all tests"""
    print("=" * 60)
    print(" PremiumHatStore FastAPI Backend - Test Suite")
    print("=" * 60)
    print(f" Base URL: {BASE_URL}")
    print(f" Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    results = []
    
    # Test endpoints
    results.append(("Status Check", await test_status()))
    results.append(("API Documentation", await test_docs()))
    results.append(("Telegram Auth", await test_auth()))
    results.append(("Create Invoice", await test_create_invoice()))
    results.append(("Send Dice", await test_send_dice()))
    
    # Summary
    print("\n" + "=" * 60)
    print(" Test Summary")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f" {status}  {test_name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print("=" * 60)
    print(f" Total: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        print("\nNote: Some tests require valid Telegram bot configuration")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite error: {e}")
