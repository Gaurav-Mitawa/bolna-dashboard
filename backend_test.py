#!/usr/bin/env python3
"""
Backend API Testing for Cluster X Landing Page
Tests the demo call endpoint functionality
"""

import requests
import sys
import json
from datetime import datetime

class LandingPageAPITester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def test_demo_call_endpoint_valid_phone(self):
        """Test demo call endpoint with valid phone number"""
        url = f"{self.base_url}/api/demo/call"
        payload = {"phone_number": "+919876543210"}
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            
            # Expected: 503 (service not configured) since demo credentials are placeholders
            if response.status_code == 503:
                data = response.json()
                if "service is not configured" in data.get("error", "").lower():
                    self.log_test("Demo Call - Valid Phone (Expected 503)", True, 
                                "Correctly returns 503 for unconfigured service")
                    return True
                else:
                    self.log_test("Demo Call - Valid Phone (Expected 503)", False, 
                                f"Wrong error message: {data.get('error')}")
                    return False
            elif response.status_code == 200:
                # If credentials are actually configured
                data = response.json()
                if data.get("success"):
                    self.log_test("Demo Call - Valid Phone", True, 
                                f"Call initiated: {data.get('execution_id')}")
                    return True
                else:
                    self.log_test("Demo Call - Valid Phone", False, 
                                f"Success=false: {data}")
                    return False
            else:
                self.log_test("Demo Call - Valid Phone", False, 
                            f"Unexpected status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Demo Call - Valid Phone", False, f"Request failed: {str(e)}")
            return False

    def test_demo_call_endpoint_invalid_phone(self):
        """Test demo call endpoint with invalid phone number"""
        url = f"{self.base_url}/api/demo/call"
        
        # Test cases for invalid phone numbers
        invalid_phones = [
            {"phone_number": "123456"},  # Too short
            {"phone_number": "+1234"},   # Too short with country code
            {"phone_number": "9876543210"},  # Missing country code
            {"phone_number": "invalid"},  # Non-numeric
        ]
        
        all_passed = True
        for payload in invalid_phones:
            try:
                response = requests.post(url, json=payload, timeout=10)
                
                if response.status_code == 400:
                    data = response.json()
                    if "invalid" in data.get("error", "").lower():
                        continue  # This test case passed
                    else:
                        self.log_test(f"Demo Call - Invalid Phone ({payload['phone_number']})", False, 
                                    f"Wrong error message: {data.get('error')}")
                        all_passed = False
                else:
                    self.log_test(f"Demo Call - Invalid Phone ({payload['phone_number']})", False, 
                                f"Expected 400, got {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_test(f"Demo Call - Invalid Phone ({payload['phone_number']})", False, 
                            f"Request failed: {str(e)}")
                all_passed = False
        
        if all_passed:
            self.log_test("Demo Call - Invalid Phone Numbers", True, 
                        "All invalid phone numbers correctly rejected")
        
        return all_passed

    def test_demo_call_endpoint_missing_phone(self):
        """Test demo call endpoint with missing phone number"""
        url = f"{self.base_url}/api/demo/call"
        payload = {}  # Missing phone_number
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "required" in data.get("error", "").lower():
                    self.log_test("Demo Call - Missing Phone", True, 
                                "Correctly rejects missing phone number")
                    return True
                else:
                    self.log_test("Demo Call - Missing Phone", False, 
                                f"Wrong error message: {data.get('error')}")
                    return False
            else:
                self.log_test("Demo Call - Missing Phone", False, 
                            f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Demo Call - Missing Phone", False, f"Request failed: {str(e)}")
            return False

    def test_server_health(self):
        """Test if server is responding"""
        try:
            response = requests.get(f"{self.base_url}/api/demo/call", timeout=5)
            # Server is responding, that's what matters
            if response.status_code < 500:
                self.log_test("Server Health", True, f"Server responding (status: {response.status_code})")
                return True
            else:
                self.log_test("Server Health", False, 
                            f"Server error: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Server Health", False, f"Server not responding: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for Cluster X Landing Page")
        print("=" * 60)
        
        # Test server health first
        if not self.test_server_health():
            print("❌ Server not responding. Stopping tests.")
            return False
        
        # Test demo call endpoint
        self.test_demo_call_endpoint_valid_phone()
        self.test_demo_call_endpoint_invalid_phone()
        self.test_demo_call_endpoint_missing_phone()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = LandingPageAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/test_reports/backend_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())