"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useAvatar } from "@/components/avatar-provider"
import { User, Edit, Save, X, Upload, Smartphone } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"

export default function ProfilePage() {
  const { user } = useAuth()
  const { avatarUrl, refreshAvatar } = useAvatar()
  const { toast } = useToast()
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(`${user?.firstName || ''} ${user?.lastName || ''}`.trim())
  const [avatarPreview, setAvatarPreview] = useState("/placeholder.svg")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update avatar preview when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      setAvatarPreview(avatarUrl)
    }
  }, [avatarUrl])

  // If no user is authenticated, redirect or show loading
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading profile...</p>
      </div>
    )
  }

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username

  const handleNameSave = async () => {
    if (editedName.trim()) {
      try {
        const [firstName, ...lastNameParts] = editedName.trim().split(' ')
        const lastName = lastNameParts.join(' ')
        
        const response = await fetch('/api/profile/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('hydro-nexus-token')}`
          },
          body: JSON.stringify({
            firstName: firstName || '',
            lastName: lastName || '',
            fullName: editedName.trim()
          })
        })
        
        if (response.ok) {
          setIsEditingName(false)
          toast({
            title: "Profile Updated",
            description: "Your name has been updated successfully.",
          })
          
          // Optionally refresh the page to update the user context
          window.location.reload()
        } else {
          const error = await response.json()
          toast({
            title: "Update Failed",
            description: error.error || "Failed to update profile",
            variant: "destructive"
          })
        }
      } catch (error) {
        toast({
          title: "Update Failed",
          description: "An error occurred while updating your profile",
          variant: "destructive"
        })
      }
    }
  }

  const handleNameCancel = () => {
    setEditedName(fullName)
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
      reader.onload = async (e) => {
        const result = e.target?.result as string
        setAvatarPreview(result)
        
        try {
          const response = await fetch('/api/profile/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('hydro-nexus-token')}`
            },
            body: JSON.stringify({
              avatarData: result
            })
          })
          
          if (response.ok) {
            // Refresh the avatar in the context so it updates everywhere
            await refreshAvatar()
            toast({
              title: "Avatar Updated",
              description: "Your profile picture has been updated.",
            })
          } else {
            const error = await response.json()
            toast({
              title: "Upload Failed",
              description: error.error || "Failed to upload avatar",
              variant: "destructive"
            })
          }
        } catch (error) {
          toast({
            title: "Upload Failed",
            description: "An error occurred while uploading your avatar",
            variant: "destructive"
          })
        }
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
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 cursor-pointer" onClick={handleAvatarClick}>
              <AvatarImage src={avatarPreview || "/placeholder.svg"} alt={fullName} />
              <AvatarFallback className="bg-green-100 text-green-700 text-lg sm:text-xl">
                {fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                className="border-green-200 hover:border-green-400 bg-transparent text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Change Avatar
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <p className="text-xs text-black-950/70">JPG, PNG or GIF (max. 2MB)</p>
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm sm:text-base">
              Full Name
            </Label>
            {isEditingName ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  id="fullName"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="border-green-200 focus:border-green-500 flex-1 text-sm sm:text-base"
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
                    className="flex-1 sm:flex-none bg-transparent"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  value={fullName}
                  readOnly
                  className="border-green-200 bg-green-50/50 flex-1 text-sm sm:text-base"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingName(true)}
                  className="border-green-200 hover:border-green-400 bg-transparent"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">
              Email Address
            </Label>
            <Input
              id="email"
              value={user.email || ''}
              readOnly
              className="border-green-200 bg-green-50/50 text-sm sm:text-base"
            />
            <p className="text-xs text-black-950/70">Email address cannot be changed</p>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm sm:text-base">
              Username
            </Label>
            <Input
              id="username"
              value={user.username || ''}
              readOnly
              className="border-green-200 bg-green-50/50 text-sm sm:text-base"
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm sm:text-base">
              User Role
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                id="role"
                value={user.role || 'user'}
                readOnly
                className="border-green-200 bg-green-50/50 flex-1 text-sm sm:text-base"
              />
              <Badge variant="outline" className="border-green-200 text-green-700 self-start sm:self-center">
                {user.role || 'user'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices Summary */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
            Connected Devices
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">Overview of devices linked to your account</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 gap-4 sm:gap-8 text-center sm:text-left">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-700">8</div>
                <div className="text-xs sm:text-sm text-black-950/70">Active Devices</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-yellow-600">2</div>
                <div className="text-xs sm:text-sm text-black-950/70">Need Attention</div>
              </div>
            </div>
            <Link href="/devices" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto border-green-200 hover:border-green-400 bg-transparent text-sm sm:text-base"
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
