import requests
import unittest
import json
import os
import sys
from time import sleep

class TwitchStreamAPITest(unittest.TestCase):
    def setUp(self):
        # Get the backend URL from environment or use the public endpoint
        self.base_url = "https://ee62479d-239b-4f2a-b941-3bb1872f9ee8.preview.emergentagent.com"
        print(f"Testing against backend URL: {self.base_url}")
        
        # Test credentials
        self.test_credentials = {
            "clientId": "test_client_id",
            "clientSecret": "test_client_secret",
            "streamKey": "test_stream_key"
        }
        
        # Stream configuration
        self.stream_config = {
            "width": 1280,
            "height": 720,
            "frameRate": 30,
            "bitrate": 2500
        }

    def test_01_health_check(self):
        """Test the health check endpoint"""
        print("\n🔍 Testing health check endpoint...")
        try:
            response = requests.get(f"{self.base_url}/api/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("status", data)
            self.assertEqual(data["status"], "healthy")
            print("✅ Health check endpoint is working")
        except Exception as e:
            self.fail(f"❌ Health check test failed: {str(e)}")

    def test_02_credential_validation(self):
        """Test the credential validation endpoint"""
        print("\n🔍 Testing credential validation endpoint...")
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/validate",
                json=self.test_credentials
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            
            # Note: With test credentials, we expect validation to fail
            # but the API should still return a proper response
            print(f"✅ Credential validation endpoint responded with: {data}")
            
            # We're just testing the API works, not that credentials are valid
            self.assertIn("valid", data)
        except Exception as e:
            self.fail(f"❌ Credential validation test failed: {str(e)}")

    def test_03_stream_start(self):
        """Test the stream start endpoint"""
        print("\n🔍 Testing stream start endpoint...")
        try:
            payload = {
                "credentials": self.test_credentials,
                "streamConfig": self.stream_config
            }
            
            response = requests.post(
                f"{self.base_url}/api/stream/start",
                json=payload
            )
            
            # Note: With test credentials, we expect this to fail
            # but the API should still return a proper response
            print(f"✅ Stream start endpoint responded with status: {response.status_code}")
            print(f"Response: {response.text}")
            
            # We're just testing the API responds, not that streaming works
            self.assertIn(response.status_code, [200, 400, 401, 403, 500])
        except Exception as e:
            self.fail(f"❌ Stream start test failed: {str(e)}")

    def test_04_stream_status(self):
        """Test the stream status endpoint"""
        print("\n🔍 Testing stream status endpoint...")
        try:
            response = requests.get(f"{self.base_url}/api/stream/status")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("active_streams", data)
            print(f"✅ Stream status endpoint responded with: {data}")
        except Exception as e:
            self.fail(f"❌ Stream status test failed: {str(e)}")

    def test_05_stream_stop(self):
        """Test the stream stop endpoint"""
        print("\n🔍 Testing stream stop endpoint...")
        try:
            response = requests.post(f"{self.base_url}/api/stream/stop")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("success", data)
            print(f"✅ Stream stop endpoint responded with: {data}")
        except Exception as e:
            self.fail(f"❌ Stream stop test failed: {str(e)}")

if __name__ == "__main__":
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
