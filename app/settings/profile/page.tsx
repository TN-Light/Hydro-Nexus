"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { usePreferencesStore } from "@/lib/stores/preferences-store"
import { User, Edit, Save, X, Upload, Smartphone } from "lucide-react"
import { useState, useRef } from "react"
import Link from "next/link"

export default function ProfilePage() {
  const { profile, updateProfile } = usePreferencesStore()
  const { toast } = useToast()
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(profile.fullName)
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleNameSave = () => {
    if (editedName.trim()) {
      updateProfile({ fullName: editedName.trim() })
      setIsEditingName(false)
      toast({
        title: "Profile Updated",
        description: "Your name has been updated successfully.",
      })
    }
  }

  const handleNameCancel = () => {
    setEditedName(profile.fullName)
    setIsEditingName(false)
  }

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        updateProfile({ avatarUrl: result })
        toast({
          title: "Avatar Updated",
          description: "Your profile picture has been updated.",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 cursor-pointer" onClick={handleAvatarClick}>
              <AvatarImage src={avatarPreview || "/placeholder.svg"} alt={profile.fullName} />
              <AvatarFallback className="bg-green-100 text-green-700 text-lg sm:text-xl dark:bg-gray-700 dark:text-gray-300">
                {profile.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                className="border-green-200 hover:border-green-400 bg-transparent text-sm dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Avatar
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <p className="text-xs text-soil-950/70 dark:text-gray-400">JPG, PNG or GIF (max. 2MB)</p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm sm:text-base dark:text-gray-300">
              Full Name
            </Label>
            {isEditingName ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  id="fullName"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="border-green-200 focus:border-green-500 flex-1 text-sm sm:text-base dark:bg-gray-800 dark:text-white"
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleNameSave}
                    className="agriculture-gradient text-white flex-1 sm:flex-none"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNameCancel}
                    className="flex-1 sm:flex-none bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  value={profile.fullName}
                  readOnly
                  className="border-green-200 bg-green-50/50 flex-1 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-300"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingName(true)}
                  className="border-green-200 hover:border-green-400 bg-transparent dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base dark:text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              value={profile.email}
              readOnly
              className="border-green-200 bg-green-50/50 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-300"
            />
            <p className="text-xs text-soil-950/70 dark:text-gray-400">Email address cannot be changed</p>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm sm:text-base dark:text-gray-300">
              Username
            </Label>
            <Input
              id="username"
              value={profile.username}
              readOnly
              className="border-green-200 bg-green-50/50 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-300"
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm sm:text-base dark:text-gray-300">
              User Role
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                id="role"
                value={profile.role}
                readOnly
                className="border-green-200 bg-green-50/50 flex-1 text-sm sm:text-base dark:bg-gray-700 dark:text-gray-300"
              />
              <Badge
                variant="outline"
                className="border-green-200 text-green-700 self-start sm:self-center dark:bg-gray-700 dark:text-gray-300"
              >
                {profile.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl dark:text-white">
            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Connected Devices
          </CardTitle>
          <CardDescription className="text-sm sm:text-base dark:text-gray-300">
            Overview of devices linked to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 sm:gap-8 text-center sm:text-left">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">8</div>
                <div className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">Active Devices</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">2</div>
                <div className="text-xs sm:text-sm text-soil-950/70 dark:text-gray-400">Need Attention</div>
              </div>
            </div>
            <Link href="/devices" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-green-200 hover:border-green-400 bg-transparent text-sm sm:text-base dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Manage Devices
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
