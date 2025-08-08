"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Shield, Lock, Trash2, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SecurityPage() {
  const { logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const isPasswordFormValid =
    passwordForm.current.length >= 6 &&
    passwordForm.new.length >= 6 &&
    passwordForm.new === passwordForm.confirm &&
    passwordForm.new !== passwordForm.current

  const handlePasswordUpdate = async () => {
    setIsUpdatingPassword(true)

    // Simulate password update
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    })

    setPasswordForm({ current: "", new: "", confirm: "" })
    setIsUpdatingPassword(false)
  }

  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== "delete my account") {
      toast({
        title: "Confirmation Failed",
        description: "Please type 'delete my account' to confirm.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)

    // Simulate account deletion
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast({
      title: "Account Deleted",
      description: "Your account has been permanently deleted.",
      variant: "destructive",
    })

    logout()
    router.push("/login")
  }

  const handleEnable2FA = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Two-factor authentication will be available in a future update.",
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Update your account password for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm sm:text-base">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
              className="text-sm sm:text-base"
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm sm:text-base">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, new: e.target.value }))}
              className="text-sm sm:text-base"
              placeholder="Enter your new password"
            />
            <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm sm:text-base">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
              className="text-sm sm:text-base"
              placeholder="Confirm your new password"
            />
            {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <Button
            onClick={handlePasswordUpdate}
            disabled={!isPasswordFormValid || isUpdatingPassword}
            className="w-full sm:w-auto agriculture-gradient text-white hover:opacity-90 text-sm sm:text-base"
          >
            {isUpdatingPassword ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 gap-4">
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="font-medium text-yellow-400 text-sm sm:text-base">2FA Status</p>
                <Badge
                  variant="outline"
                  className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 self-start sm:self-center"
                >
                  Not Enabled
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-yellow-400/80">
                Two-factor authentication is not currently enabled for your account
              </p>
            </div>
            <Button
              onClick={handleEnable2FA}
              variant="outline"
              className="w-full sm:w-auto border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 bg-transparent text-sm sm:text-base"
            >
              Enable 2FA
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">This feature will be available in a future update</p>
        </CardContent>
      </Card>

      {/* Account Security Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Security Summary</CardTitle>
          <CardDescription className="text-sm sm:text-base">Overview of your account security status</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20 gap-2">
              <div>
                <p className="font-medium text-green-400 text-sm sm:text-base">Password</p>
                <p className="text-xs text-green-400/80">Strong password set</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 self-start sm:self-center">Secure</Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 gap-2">
              <div>
                <p className="font-medium text-yellow-400 text-sm sm:text-base">Two-Factor Auth</p>
                <p className="text-xs text-yellow-400/80">Not enabled</p>
              </div>
              <Badge
                variant="outline"
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 self-start sm:self-center"
              >
                Pending
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-destructive">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Delete Account
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="p-3 sm:p-4 bg-destructive/10 rounded-lg border border-destructive/20 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive text-sm sm:text-base">Warning: This action cannot be undone</p>
                <p className="text-xs sm:text-sm text-destructive/80 mt-1">
                  Deleting your account will permanently remove all your data, including:
                </p>
                <ul className="text-xs sm:text-sm text-destructive/80 mt-2 ml-4 list-disc space-y-1">
                  <li>Profile information and preferences</li>
                  <li>Historical sensor data and analytics</li>
                  <li>Device configurations and settings</li>
                  <li>All associated files and documents</li>
                </ul>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Account Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm sm:text-base">
                  This action will permanently delete your account and cannot be undone. All your data will be lost
                  forever.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation" className="text-sm sm:text-base">
                    Type &quot;delete my account&quot; to confirm:
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="delete my account"
                    className="border-destructive focus:border-destructive/80 text-sm sm:text-base"
                  />
                </div>
              </div>

              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel onClick={() => setDeleteConfirmation("")} className="w-full sm:w-auto">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleAccountDeletion}
                  disabled={deleteConfirmation !== "delete my account" || isDeleting}
                  className="w-full sm:w-auto"
                  asChild
                >
                  <Button variant="destructive" disabled={deleteConfirmation !== "delete my account" || isDeleting}>
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      "Delete Account"
                    )}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
