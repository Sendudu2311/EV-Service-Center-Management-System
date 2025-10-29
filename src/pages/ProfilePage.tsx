import React, { useState, useEffect } from "react";
import {
  UserIcon,
  PencilIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";

interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  avatar?: string;
  // serviceCenterId removed - single center architecture
  code: string;
  specializations?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    validUntil: string;
  }>;
  createdAt: string;
  lastLogin?: string;
}

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;
      setProfile(userData);
      setEditData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await updateProfile(editData);
      await fetchProfile();
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setChangingPassword(false);
      toast.success("Password changed successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-lime-100 text-lime-800";
      case "technician":
        return "bg-green-100 text-green-800";
      default:
        return "bg-dark-100 text-gray-800";
    }
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">
            Failed to load profile
          </h2>
          <button
            onClick={fetchProfile}
            className="mt-4 px-4 py-2 bg-lime-200 text-dark-900 rounded-lg hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-text-secondary mt-2">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info Card */}
          <div className="lg:col-span-2">
            <div className="bg-dark-300 shadow rounded-lg">
              <div className="px-6 py-5 border-b border-dark-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Personal Information
                  </h2>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center px-3 py-2 border border-dark-300 shadow-sm text-sm leading-4 text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 focus:ring-offset-dark-900"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditData({
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            phone: profile.phone,
                          });
                        }}
                        className="inline-flex items-center px-3 py-2 border border-dark-300 shadow-sm text-sm leading-4 text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleEditSubmit}
                        disabled={loading}
                        className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 text-white bg-lime-600 hover:bg-lime-500 hover:text-dark-900 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 focus:ring-offset-dark-900 disabled:opacity-50"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-5">
                {editing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="block text-sm text-text-muted text-text-secondary"
                        >
                          First Name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          required
                          value={editData.firstName}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              firstName: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="lastName"
                          className="block text-sm text-text-muted text-text-secondary"
                        >
                          Last Name
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          required
                          value={editData.lastName}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              lastName: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm text-text-muted text-text-secondary"
                      >
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                      />
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-dark-300 rounded-full flex items-center justify-center">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-8 h-8 text-text-muted" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {profile.firstName} {profile.lastName}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-text-muted ${getRoleBadgeColor(
                            profile.role
                          )}`}
                        >
                          {profile.role.charAt(0).toUpperCase() +
                            profile.role.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <dt className="text-sm text-text-muted text-text-muted">
                          Email Address
                        </dt>
                        <dd className="mt-1 text-sm text-white">
                          {profile.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-text-muted text-text-muted">
                          Phone Number
                        </dt>
                        <dd className="mt-1 text-sm text-white">
                          {profile.phone}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-text-muted text-text-muted">
                          Account Created
                        </dt>
                        <dd className="mt-1 text-sm text-white">
                          {formatDate(profile.createdAt)}
                        </dd>
                      </div>
                      {profile.lastLogin && (
                        <div>
                          <dt className="text-sm text-text-muted text-text-muted">
                            Last Login
                          </dt>
                          <dd className="mt-1 text-sm text-white">
                            {formatDate(profile.lastLogin)}
                          </dd>
                        </div>
                      )}
                    </div>

                    {/* Service Center information removed - single center architecture */}

                    {profile.specializations &&
                      profile.specializations.length > 0 && (
                        <div>
                          <dt className="text-sm text-text-muted text-text-muted">
                            Specializations
                          </dt>
                          <dd className="mt-1">
                            <div className="flex flex-wrap gap-2">
                              {profile.specializations.map((spec, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-dark-300 text-lime-600"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </dd>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Password Change */}
            <div className="bg-dark-300 shadow rounded-lg">
              <div className="px-6 py-5 border-b border-dark-200">
                <h3 className="text-lg font-semibold text-white">
                  Security
                </h3>
              </div>
              <div className="px-6 py-5">
                {!changingPassword ? (
                  <button
                    onClick={() => setChangingPassword(true)}
                    className="inline-flex items-center px-4 py-2 border border-dark-300 shadow-sm text-sm text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 focus:ring-offset-dark-900"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Change Password
                  </button>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="currentPassword"
                        className="block text-sm text-text-muted text-text-secondary"
                      >
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        required
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm text-text-muted text-text-secondary"
                      >
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        required
                        minLength={6}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm text-text-muted text-text-secondary"
                      >
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        required
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="mt-1 block w-full border-dark-300 rounded-md shadow-sm focus:ring-lime-400 focus:ring-offset-dark-900 focus:border-lime-400 sm:text-sm"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm text-white bg-lime-600 hover:bg-lime-500 hover:text-dark-900 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 focus:ring-lime-400 focus:ring-offset-dark-900 disabled:opacity-50"
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangingPassword(false);
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                        className="inline-flex items-center px-4 py-2 border border-dark-300 shadow-sm text-sm text-text-muted rounded-md text-text-secondary bg-dark-300 hover:bg-dark-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Certifications */}
            {profile.certifications && profile.certifications.length > 0 && (
              <div className="bg-dark-300 shadow rounded-lg">
                <div className="px-6 py-5 border-b border-dark-200">
                  <h3 className="text-lg font-semibold text-white">
                    Certifications
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <div className="space-y-4">
                    {profile.certifications.map((cert, index) => (
                      <div
                        key={index}
                        className="border border-dark-200 rounded-lg p-3"
                      >
                        <h4 className="text-text-muted text-white">
                          {cert.name}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          Issued by {cert.issuer}
                        </p>
                        <p className="text-sm text-text-muted">
                          Valid until {formatDate(cert.validUntil)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
