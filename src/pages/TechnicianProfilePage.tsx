import React, { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  WrenchScrewdriverIcon,
  CalendarIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { techniciansAPI } from '../services/api';
import toast from 'react-hot-toast';

interface WorkingHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
}

interface Skill {
  category: string;
  level: number; // 1-5 scale
  certified: boolean;
  certificationDate?: string;
  expiryDate?: string;
}

interface TechnicianProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specializations: string[];
  workingHours: WorkingHours[];
  skills: Skill[];
  availability: {
    status: 'available' | 'busy' | 'break' | 'offline';
    workloadPercentage: number;
  };
  stats: {
    completedAppointments: number;
    averageRating: number;
    totalWorkHours: number;
  };
}

const DAYS_OF_WEEK = [
  'Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'
];

const SKILL_CATEGORIES = [
  'Bảo dưỡng pin',
  'Hệ thống sạc',
  'Động cơ điện',
  'Hệ thống phanh',
  'Điện tử ô tô',
  'Chẩn đoán',
  'Sửa chữa khung xe',
  'Hệ thống điều hòa'
];

const AVAILABILITY_STATUS = {
  available: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-800' },
  busy: { label: 'Bận', color: 'bg-yellow-100 text-yellow-800' },
  break: { label: 'Nghỉ giải lao', color: 'bg-blue-100 text-blue-800' },
  offline: { label: 'Ngoại tuyến', color: 'bg-gray-100 text-gray-800' }
};

const TechnicianProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule' | 'skills'>('profile');

  // Form states
  const [editingHours, setEditingHours] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [newSkill, setNewSkill] = useState<Partial<Skill>>({
    category: '',
    level: 1,
    certified: false
  });
  const [showAddSkill, setShowAddSkill] = useState(false);

  /**
   * Fetch technician profile data
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await techniciansAPI.getProfile();
      const profileData = response.data.data as TechnicianProfile;

      setProfile(profileData);
      setWorkingHours(profileData.workingHours || getDefaultWorkingHours());
    } catch (error: unknown) {
      console.error('Error fetching profile:', error);
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get default working hours (Monday-Friday 8:00-17:00)
   */
  const getDefaultWorkingHours = (): WorkingHours[] => {
    return Array.from({ length: 7 }, (_, index) => ({
      dayOfWeek: index,
      startTime: index >= 1 && index <= 5 ? '08:00' : '08:00',
      endTime: index >= 1 && index <= 5 ? '17:00' : '17:00',
      isActive: index >= 1 && index <= 5 // Monday to Friday active by default
    }));
  };

  /**
   * Update working hours
   */
  const updateWorkingHours = useCallback(async () => {
    try {
      setUpdating(true);
      await techniciansAPI.updateProfile({ workingHours });

      toast.success('Đã cập nhật giờ làm việc thành công');
      setEditingHours(false);
      fetchProfile(); // Refresh data
    } catch (error: unknown) {
      console.error('Error updating working hours:', error);
      toast.error('Không thể cập nhật giờ làm việc');
    } finally {
      setUpdating(false);
    }
  }, [workingHours, fetchProfile]);

  /**
   * Add new skill
   */
  const addSkill = useCallback(async () => {
    if (!newSkill.category || !newSkill.level) {
      toast.error('Vui lòng điền đầy đủ thông tin kỹ năng');
      return;
    }

    try {
      setUpdating(true);
      const updatedSkills = [...(profile?.skills || []), newSkill as Skill];
      await techniciansAPI.updateProfile({ skills: updatedSkills });

      toast.success('Đã thêm kỹ năng thành công');
      setShowAddSkill(false);
      setNewSkill({ category: '', level: 1, certified: false });
      fetchProfile(); // Refresh data
    } catch (error: unknown) {
      console.error('Error adding skill:', error);
      toast.error('Không thể thêm kỹ năng');
    } finally {
      setUpdating(false);
    }
  }, [newSkill, profile?.skills, fetchProfile]);

  /**
   * Update availability status
   */
  const updateAvailability = useCallback(async (status: string) => {
    try {
      setUpdating(true);
      await techniciansAPI.updateAvailability(profile?._id || '', status);

      toast.success(`Đã cập nhật trạng thái: ${AVAILABILITY_STATUS[status as keyof typeof AVAILABILITY_STATUS]?.label}`);
      fetchProfile(); // Refresh data
    } catch (error: unknown) {
      console.error('Error updating availability:', error);
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  }, [profile?._id, fetchProfile]);

  /**
   * Remove skill
   */
  const removeSkill = useCallback(async (skillIndex: number) => {
    try {
      setUpdating(true);
      const updatedSkills = profile?.skills.filter((_, index) => index !== skillIndex) || [];
      await techniciansAPI.updateProfile({ skills: updatedSkills });

      toast.success('Đã xóa kỹ năng thành công');
      fetchProfile(); // Refresh data
    } catch (error: unknown) {
      console.error('Error removing skill:', error);
      toast.error('Không thể xóa kỹ năng');
    } finally {
      setUpdating(false);
    }
  }, [profile?.skills, fetchProfile]);

  // Effects
  useEffect(() => {
    if (user?.role === 'technician') {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  if (user?.role !== 'technician') {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-500">Trang này chỉ dành cho kỹ thuật viên.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Đang tải thông tin hồ sơ...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy hồ sơ</h3>
        <p className="text-gray-500">Vui lòng liên hệ quản trị viên để được hỗ trợ.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-12 w-12 text-gray-400" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <p className="text-gray-500">{profile.email}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    AVAILABILITY_STATUS[profile.availability.status]?.color
                  }`}>
                    {AVAILABILITY_STATUS[profile.availability.status]?.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    Tỷ lệ công việc: {profile.availability.workloadPercentage}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {Object.entries(AVAILABILITY_STATUS).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => updateAvailability(status)}
                  disabled={updating || profile.availability.status === status}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    profile.availability.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } disabled:opacity-50`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Lịch hẹn hoàn thành</p>
              <p className="text-2xl font-bold text-gray-900">{profile.stats.completedAppointments}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đánh giá trung bình</p>
              <p className="text-2xl font-bold text-gray-900">{(profile.stats.averageRating || 0).toFixed(1)}/5</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng giờ làm việc</p>
              <p className="text-2xl font-bold text-gray-900">{profile.stats.totalWorkHours}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {[
              { id: 'profile', label: 'Thông tin cá nhân', icon: UserIcon },
              { id: 'schedule', label: 'Lịch làm việc', icon: CalendarIcon },
              { id: 'skills', label: 'Kỹ năng', icon: WrenchScrewdriverIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thông tin liên hệ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                    <p className="mt-1 text-sm text-gray-900">{profile.phone}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Chuyên môn</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Lịch làm việc hàng tuần</h3>
                <div className="flex space-x-2">
                  {editingHours ? (
                    <>
                      <button
                        onClick={updateWorkingHours}
                        disabled={updating}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updating ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingHours(false);
                          setWorkingHours(profile.workingHours || getDefaultWorkingHours());
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingHours(true)}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {workingHours.map((hours, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-20">
                        <span className="text-sm font-medium text-gray-900">
                          {DAYS_OF_WEEK[hours.dayOfWeek]}
                        </span>
                      </div>
                      {editingHours ? (
                        <>
                          <input
                            type="checkbox"
                            checked={hours.isActive}
                            onChange={(e) => {
                              const updated = [...workingHours];
                              updated[index].isActive = e.target.checked;
                              setWorkingHours(updated);
                            }}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <input
                            type="time"
                            value={hours.startTime}
                            onChange={(e) => {
                              const updated = [...workingHours];
                              updated[index].startTime = e.target.value;
                              setWorkingHours(updated);
                            }}
                            disabled={!hours.isActive}
                            className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                          <span className="text-gray-500">đến</span>
                          <input
                            type="time"
                            value={hours.endTime}
                            onChange={(e) => {
                              const updated = [...workingHours];
                              updated[index].endTime = e.target.value;
                              setWorkingHours(updated);
                            }}
                            disabled={!hours.isActive}
                            className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                        </>
                      ) : (
                        <>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            hours.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {hours.isActive ? 'Hoạt động' : 'Nghỉ'}
                          </span>
                          {hours.isActive && (
                            <span className="text-sm text-gray-900">
                              {hours.startTime} - {hours.endTime}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Kỹ năng chuyên môn</h3>
                <button
                  onClick={() => setShowAddSkill(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Thêm kỹ năng
                </button>
              </div>

              {/* Add Skill Form */}
              {showAddSkill && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Thêm kỹ năng mới</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Danh mục
                      </label>
                      <select
                        value={newSkill.category}
                        onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Chọn danh mục</option>
                        {SKILL_CATEGORIES.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trình độ (1-5)
                      </label>
                      <select
                        value={newSkill.level}
                        onChange={(e) => setNewSkill({ ...newSkill, level: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((level) => (
                          <option key={level} value={level}>
                            {level} - {level === 1 ? 'Cơ bản' : level === 2 ? 'Khá' : level === 3 ? 'Tốt' : level === 4 ? 'Giỏi' : 'Xuất sắc'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newSkill.certified || false}
                        onChange={(e) => setNewSkill({ ...newSkill, certified: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Có chứng chỉ
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={addSkill}
                        disabled={updating}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        Thêm
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSkill(false);
                          setNewSkill({ category: '', level: 1, certified: false });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Skills List */}
              <div className="space-y-4">
                {profile.skills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{skill.category}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`w-3 h-3 rounded-full ${
                                  level <= skill.level ? 'bg-blue-500' : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            Trình độ {skill.level}/5
                          </span>
                          {skill.certified && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <CheckIcon className="h-3 w-3 mr-1" />
                              Có chứng chỉ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSkill(index)}
                      disabled={updating}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                {profile.skills.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <WrenchScrewdriverIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Chưa có kỹ năng nào được thêm.</p>
                    <p className="text-sm">Hãy thêm kỹ năng để cải thiện hồ sơ của bạn.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianProfilePage;