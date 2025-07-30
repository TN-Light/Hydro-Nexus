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
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Change Password
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Update your account password for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm sm:text-base dark:text-gray-300">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
              className="border-green-200 focus:border-green-500 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm sm:text-base dark:text-gray-300">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, new: e.target.value }))}
              className="border-green-200 focus:border-green-500 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
              placeholder="Enter your new password"
            />
            <p className="text-xs text-soil-950/70 dark:text-gray-400">Password must be at least 6 characters long</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm sm:text-base dark:text-gray-300">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
              className="border-green-200 focus:border-green-500 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
              placeholder="Confirm your new password"
            />
            {passwordForm.confirm && passwordForm.new !== passwordForm.confirm && (
              <p className="text-xs text-red-600">Passwords do not match</p>
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
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200 gap-4 dark:bg-gray-800 dark:border-gray-700">
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="font-medium text-soil-950 text-sm sm:text-base dark:text-gray-300">2FA Status</p>
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-yellow-700 border-yellow-200 self-start sm:self-center dark:bg-gray-700 dark:text-gray-300"
                >
                  Not Enabled
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">
                Two-factor authentication is not currently enabled for your account
              </p>
            </div>
            <Button
              onClick={handleEnable2FA}
              variant="outline"
              className="w-full sm:w-auto border-yellow-300 text-yellow-700 hover:bg-yellow-50 bg-transparent text-sm sm:text-base dark:text-yellow-400 dark:hover:bg-gray-700"
            >
              Enable 2FA
            </Button>
          </div>
          <p className="text-xs text-soil-950/70 mt-3 dark:text-gray-400">
            This feature will be available in a future update
          </p>
        </CardContent>
      </Card>

      {/* Account Security Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl dark:text-white">Security Summary</CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Overview of your account security status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 gap-2 dark:bg-gray-800 dark:border-gray-700">
              <div>
                <p className="font-medium text-green-800 text-sm sm:text-base dark:text-green-400">Password</p>
                <p className="text-xs text-green-700 dark:text-green-300">Strong password set</p>
              </div>
              <Badge className="bg-green-100 text-green-700 self-start sm:self-center dark:bg-gray-700 dark:text-gray-300">
                Secure
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200 gap-2 dark:bg-gray-800 dark:border-gray-700">
              <div>
                <p className="font-medium text-yellow-800 text-sm sm:text-base dark:text-yellow-400">
                  Two-Factor Auth
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">Not enabled</p>
              </div>
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-700 border-yellow-200 self-start sm:self-center dark:bg-gray-700 dark:text-gray-300"
              >
                Pending
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-red-700 text-lg sm:text-xl dark:text-red-400">
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Delete Account
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200 mb-4 dark:bg-red-900/20 dark:border-red-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm sm:text-base dark:text-red-400">
                  Warning: This action cannot be undone
                </p>
                <p className="text-xs sm:text-sm text-red-700 mt-1 dark:text-red-300">
                  Deleting your account will permanently remove all your data, including:
                </p>
                <ul className="text-xs sm:text-sm text-red-700 mt-2 ml-4 list-disc space-y-1 dark:text-red-300">
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
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-sm sm:text-base"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Confirm Account Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm sm:text-base dark:text-gray-300">
                  This action will permanently delete your account and cannot be undone. All your data will be lost
                  forever.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation" className="text-sm sm:text-base dark:text-gray-300">
                    Type "delete my account" to confirm:
                  </Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="delete my account"
                    className="border-red-200 focus:border-red-500 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
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
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
