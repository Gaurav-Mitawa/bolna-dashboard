import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileTab() {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        <p className="text-sm text-gray-500">Update your personal details and contact information.</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="h-24 w-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-3xl font-semibold">
          S
        </div>
        <Button variant="outline" className="border-gray-300 text-gray-800">
          Change Photo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-between-1.5">
          <Label className="text-sm">Full Name</Label>
          <Input placeholder="Enter your full name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Email</Label>
          <Input type="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Company</Label>
          <Input placeholder="Company name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Phone</Label>
          <Input placeholder="+1 (555) 000-0000" />
        </div>
      </div>

      <div>
        <Button className="mt-2 bg-orange-500 hover:bg-orange-600 text-white">Save Changes</Button>
      </div>
    </Card>
  );
}


