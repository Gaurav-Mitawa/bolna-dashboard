import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SecurityTab() {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        <p className="text-sm text-gray-500">
          Manage your password and enable additional layers of protection.
        </p>
      </div>

      {/* Password */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Current password</Label>
            <Input type="password" placeholder="Enter current password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">New password</Label>
            <Input type="password" placeholder="Enter new password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Confirm new password</Label>
            <Input type="password" placeholder="Re-enter new password" />
          </div>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          Update Password
        </Button>
      </div>

      {/* 2FA */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-900">Two-factor authentication</h3>
        <p className="text-sm text-gray-500">
          Add an extra layer of security to your account by requiring a one-time code on login.
        </p>
        <Button className="bg-green-500 hover:bg-green-600 text-white">
          Enable 2FA
        </Button>
      </div>
    </Card>
  );
}


