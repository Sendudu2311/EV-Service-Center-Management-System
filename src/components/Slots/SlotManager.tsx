import React, { useEffect, useState } from 'react';
import { slotsAPI, techniciansAPI, usersAPI, appointmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { vietnameseDateTimeToUTC } from '../../utils/timezone';
import AssignSlotModal from './AssignSlotModal';

// Weekly timetable: days across (Mon..Sun), times vertically. 2-hour slots 08-10,10-12,13-15,15-17
const SlotManager: React.FC = () => {
  const [weekStart, setWeekStart] = useState<string>(() => {
    // ISO date for Monday of current week
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday.toISOString().slice(0,10);
  });

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techById, setTechById] = useState<Record<string,string>>({});
  // slots indexed by date (YYYY-MM-DD) -> startHH:MM -> slot
  const [slotsWeekMap, setSlotsWeekMap] = useState<Record<string, Record<string, any>>>({});
  const [editing, setEditing] = useState<{date:string, start:string, slot:any, selectedTechIds: string[], capacity: number} | null>(null);

  // NEW: Tab system and pre-bookings
  const [activeTab, setActiveTab] = useState<'timetable' | 'prebookings'>('timetable');
  const [preBookings, setPreBookings] = useState<any[]>([]);
  const [loadingPreBookings, setLoadingPreBookings] = useState(false);
  const [selectedPreBooking, setSelectedPreBooking] = useState<any | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const slotRanges = [ ['08:00','10:00'], ['10:00','12:00'], ['13:00','15:00'], ['15:00','17:00'] ];

  useEffect(()=>{ fetchAll(); }, [weekStart, activeTab]);

  const fetchAll = async () => {
    await fetchTechnicians();
    if (activeTab === 'timetable') {
      await fetchSlotsForWeek();
    } else if (activeTab === 'prebookings') {
      await fetchPreBookings();
    }
  };

  // NEW: Fetch pre-bookings
  const fetchPreBookings = async () => {
    setLoadingPreBookings(true);
    try {
      const response = await appointmentsAPI.getPreBookings();
      const data = response.data?.data || response.data || [];
      setPreBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pre-bookings:', error);
      toast.error('Không thể tải danh sách pre-bookings');
      setPreBookings([]);
    } finally {
      setLoadingPreBookings(false);
    }
  };

  const fetchTechnicians = async () => {
    try{
      const res = await techniciansAPI.getAll();
      const data = res.data?.data || res.data || [];
      const arr = Array.isArray(data) ? data : [];
      setTechnicians(arr);
      const map: Record<string,string> = {};
      arr.forEach((t:any)=>{
        const user = t.technicianId || t;
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || user.email || user._id;
        // Map using the User ID (which is what slots reference), not the TechnicianProfile ID
        const userId = user._id || t._id;
        map[userId] = fullName;
      });
      setTechById(map);
    }catch(err){ console.error(err); setTechnicians([]); setTechById({}); }
  };;

  const getWeekDates = () => {
    const start = new Date(weekStart);
    const days = [] as string[];
    for(let i=0;i<6;i++){ const d = new Date(start); d.setDate(start.getDate()+i); days.push(d.toISOString().slice(0,10)); }
    return days;
  };

const getTechName = (slot: any) => {
    // Nếu không có slot hoặc không có thợ máy được gán, trả về dấu gạch ngang
    if (!slot || !slot.technicianIds || slot.technicianIds.length === 0) {
      return '—';
    }

    // Backend đã `populate` sẵn, nên technicianIds là một mảng object.
    // Chúng ta chỉ cần lặp qua và lấy tên.
    return slot.technicianIds.map((tech: any) => {
      // Đảm bảo tech là một object hợp lệ
      if (typeof tech === 'object' && tech !== null) {
        const fullName = `${tech.firstName || ''} ${tech.lastName || ''}`.trim();
        // Nếu có tên đầy đủ thì dùng, không thì fallback về email hoặc ID
        return fullName || tech.email || tech._id;
      }
      
      // Fallback nếu dữ liệu không phải object (hiếm khi xảy ra với code backend hiện tại)
      return tech.toString();
    }).join(', ');
  };

  const fetchSlotsForWeek = async () => {
    try{
      const days = getWeekDates();
      const from = `${days[0]}`; const to = `${days[days.length-1]}`;
      const res = await slotsAPI.list({ from, to });
      
      console.log('API Response:', res);
      console.log('res.data:', res.data);
      
      // Handle nested data structure: res.data.data.data
      let arr: any[] = [];
      const responseData: any = res.data;
      
      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        arr = responseData.data.data;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        arr = responseData.data;
      } else if (Array.isArray(responseData)) {
        arr = responseData;
      }
      
      const map: Record<string, Record<string, any>> = {};
      
      console.log('Fetched slots:', arr.length);
      
      arr.forEach((s:any)=>{
        // Use the date and startTime fields directly from the slot
        const dateKey = s.date; // Already in YYYY-MM-DD format
        const timeKey = s.startTime; // Already in HH:MM format
        
        console.log(`Mapping slot: ${dateKey} ${timeKey}`, s);
        
        map[dateKey] = map[dateKey] || {};
        map[dateKey][timeKey] = s;
      });
      
      console.log('Slots map:', map);
      setSlotsWeekMap(map);
      
      // gather technician ids seen in slots and fetch missing user names
      const techIds = new Set<string>();
      Object.values(map).forEach(dayMap => {
        Object.values(dayMap).forEach((slot:any) => {
          // Handle both technicianIds (array) and technicianId (single) for backward compatibility
          const techArray = slot?.technicianIds || (slot?.technicianId ? [slot.technicianId] : []);
          if (techArray && Array.isArray(techArray)) {
            techArray.forEach(tech => {
              if (typeof tech === 'string') {
                techIds.add(tech);
              } else if (tech._id || tech.id) {
                const id = tech._id || tech.id;
                // Handle both direct User objects and TechnicianProfile.technicianId objects
                const user = tech.technicianId || tech;
                const firstName = user.firstName || '';
                if (!techById[id]) {
                  setTechById(prev => ({ ...prev, [id]: firstName }));
                }
              }
            });
          }
        });
      });
      const missing: string[] = [];
      techIds.forEach(id => { if (!techById[id]) missing.push(id); });
      if (missing.length > 0) {
        await fetchUsersForTechIds(missing);
      }
    }catch(err){ console.error(err); setSlotsWeekMap({}); }
  };

  const fetchUsersForTechIds = async (ids: string[]) => {
    try{
      console.log('Fetching users for tech IDs:', ids);
      const calls = ids.map(id => usersAPI.getById(id).catch((err) => {
        console.error(`Failed to fetch user ${id}:`, err);
        return null;
      }));
      const results = await Promise.all(calls);
      console.log('User fetch results:', results);
      const copy = { ...techById } as Record<string,string>;
      results.forEach((r:any) => {
        if (!r || !r.data) {
          console.log('No data in response:', r);
          return;
        }
        const user = r.data?.data || r.data;
        console.log('Parsed user:', user);
        if (user && (user._id || user.id)) {
          const id = user._id || user.id;
          const firstName = user.firstName || '';
          copy[id] = firstName || user.email || id;
          console.log(`Set techById[${id}] = ${copy[id]}`);
        }
      });
      setTechById(copy);
      console.log('Updated techById:', copy);
    }catch(err){ console.error('Failed to fetch user names for technicians', err); }
  };

  const handleAssign = async (date:string, start:string, technicianIds?:string[], capacity?:number) => {
    try{
      console.log('🔧 handleAssign called with:', { date, start, technicianIds, capacity });
      const existing = slotsWeekMap[date]?.[start];
      if(existing){ 
        console.log('✏️ Updating existing slot:', existing._id, 'with technicians:', technicianIds);
        await slotsAPI.assignTechnicians(existing._id, technicianIds || []);
        
        // Update capacity if provided and different
        if (capacity !== undefined && capacity !== existing.capacity) {
          await slotsAPI.update(existing._id, { capacity });
        }
      } else {
        // find matching range
        const range = slotRanges.find(r=>r[0]===start);
        if(!range) throw new Error('Invalid slot start');
        
        console.log('📅 Creating new slot for date:', date, 'time range:', range);
        const startDate = vietnameseDateTimeToUTC(date, range[0]);
        const endDate = vietnameseDateTimeToUTC(date, range[1]);
        
        console.log('🕐 Start time (Vietnam):', `${date} ${range[0]}`);
        console.log('🕐 Start time (UTC):', startDate.toISOString());
        console.log('🕐 End time (Vietnam):', `${date} ${range[1]}`);
        console.log('🕐 End time (UTC):', endDate.toISOString());
        
        await slotsAPI.create({ technicianIds: technicianIds || [], start: startDate, end: endDate, capacity: capacity || 1 });
      }
      
      const techCount = technicianIds?.length || 0;
      toast.success(`Assigned ${techCount} technician${techCount !== 1 ? 's' : ''} to slot`);
      await fetchSlotsForWeek();
      setEditing(null);
    }catch(err:any){ 
      console.error(err); 
      toast.error(err?.response?.data?.message || err.message || 'Assign failed'); 
    }
  };

  const handleAutoAssign = async (date:string, start:string) => {
    try{
      // Get all available technician IDs
      const allTechnicianIds = technicians.map(t => t.technicianId?._id || t._id);
      
      if (allTechnicianIds.length === 0) {
        return toast.error('No technicians available');
      }
      
      // Default capacity to number of technicians for auto-assign
      const capacity = allTechnicianIds.length;
      await handleAssign(date, start, allTechnicianIds, capacity);
    }catch(err){ 
      console.error(err); 
      toast.error('Auto assign failed'); 
    }
  };

  const handleAutoAssignAll = async () => {
    try {
      // Get all available technician IDs
      const allTechnicianIds = technicians.map(t => t.technicianId?._id || t._id);
      
      if (allTechnicianIds.length === 0) {
        return toast.error('No technicians available');
      }

      const capacity = allTechnicianIds.length;
      const days = getWeekDates();
      let successCount = 0;
      let errorCount = 0;

      toast.loading('Assigning technicians to all slots...');

      // Assign to all day/time combinations
      for (const date of days) {
        for (const [start] of slotRanges) {
          try {
            await handleAssign(date, start, allTechnicianIds, capacity);
            successCount++;
          } catch (err) {
            console.error(`Failed to assign ${date} ${start}:`, err);
            errorCount++;
          }
        }
      }

      toast.dismiss();
      
      if (errorCount === 0) {
        toast.success(`Successfully assigned all technicians to ${successCount} slots!`);
      } else {
        toast.success(`Assigned to ${successCount} slots. ${errorCount} failed.`);
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Auto assign all failed');
    }
  };

  const days = getWeekDates();

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedPreBooking(null);
    fetchPreBookings(); // Refresh list
  };

  const TIME_RANGE_MAP: Record<string, { label: string; hours: string; icon: string }> = {
    morning: { label: 'Buổi sáng', hours: '8:00 - 12:00', icon: '🌅' },
    afternoon: { label: 'Buổi chiều', hours: '13:00 - 17:00', icon: '☀️' },
    evening: { label: 'Buổi tối', hours: '17:00 - 20:00', icon: '🌆' },
  };

  return (
    <div className="p-4 bg-dark-300">
      <h3 className="text-text-secondary mt-2 mb-4">Slot Manager</h3>

      {/* NEW: Tab Navigation */}
      <div className="mb-6 border-b border-dark-700">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-6 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'timetable'
                ? 'text-lime-400 border-b-2 border-lime-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📅 Weekly Timetable
          </button>
          <button
            onClick={() => setActiveTab('prebookings')}
            className={`px-6 py-3 text-sm font-semibold transition-all duration-200 relative ${
              activeTab === 'prebookings'
                ? 'text-lime-400 border-b-2 border-lime-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ⏳ Pre-bookings
            {preBookings.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {preBookings.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'timetable' ? (
        <>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Week start (Mon)</label>
          <input 
            type="date" 
            value={weekStart} 
            onChange={(e) => {
              const selectedDate = new Date(e.target.value);
              const day = selectedDate.getDay();
              
              // Only allow Monday selection (day === 1)
              if (day === 1) {
                setWeekStart(e.target.value);
              } else {
                // Find the nearest Monday
                const diff = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days; otherwise go to previous/next Monday
                const monday = new Date(selectedDate);
                monday.setDate(selectedDate.getDate() + diff);
                setWeekStart(monday.toISOString().slice(0, 10));
                toast.info('Only Monday can be selected. Adjusted to nearest Monday.');
              }
            }}
            className="rounded-md border-dark-300" 
          />
        </div>
        
        <button
          onClick={handleAutoAssignAll}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-text-muted text-sm flex items-center gap-2"
        >
          
          Auto Assign For Entire Week
        </button>
      </div>

      <div className="overflow-auto border rounded-md bg-dark-300">
        <table className="min-w-full table-auto">
          <thead>
            <tr>
              <th className="border px-2 py-2 text-text-muted">Time</th>
              {days.map(d=> (
                <th key={d} className="border px-2 py-2 text-text-muted">{new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotRanges.map(([start,end])=> (
              <tr key={start}>
                <td className="border px-2 py-2 text-text-muted ">{start} — {end}</td>
                {days.map(d=>{
                  const slot = slotsWeekMap[d]?.[start] || null;
                  const slotDateTime = new Date(`${d}T${start}`);
                  const isPast = slotDateTime < new Date();
                  return (
                    <td key={`${d}-${start}`} className="border px-2 py-2 text-text-muted align-top">
                      <div className="text-xs text-text-secondary mb-1">
                        {slot ? (
                          <span className="text-text-muted">
                            {slot.status} • Cap: {slot.capacity} • Booked: {slot.bookedCount || 0}
                          </span>
                        ) : (
                          'empty'
                        )}
                      </div>
                      
                      {/* Show different UI based on technician assignment */}
                      {slot && slot.technicianIds && slot.technicianIds.length > 0 ? (
                        // Slot has technicians assigned - show only names and edit button
                        <>
                          <div className="mb-2">
                            <div className="text-sm text-text-muted text-text-secondary mb-1">Technicians:</div>
                            <div className="text-xs text-text-secondary">{getTechName(slot)}</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={()=>{
                                // Extract current technician IDs more carefully
                                let currentTechIds: string[] = [];
                                if (slot?.technicianIds) {
                                  currentTechIds = slot.technicianIds.map((t: any) => {
                                    if (typeof t === 'string') {
                                      return t; // Already an ID
                                    }
                                    return t._id || t.id || t; // Extract ID from populated object
                                  });
                                }
                                console.log('Setting editing state with techIds:', currentTechIds);
                                setEditing({date: d, start, slot, selectedTechIds: currentTechIds, capacity: slot?.capacity || 1});
                              }} 
                              disabled={isPast}
                              className={`px-2 py-1 rounded text-xs ${isPast ? 'bg-dark-300 text-text-muted cursor-not-allowed' : 'bg-lime-600 text-dark-900 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105'}`}
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      ) : (
                        // Slot has no technicians - show placeholder and both buttons
                        <>
                          <div className="mb-2 text-text-muted italic">No technicians assigned</div>
                          <div className="flex gap-2">
                            <button 
                              onClick={()=>{
                                console.log('Setting editing state with no techIds');
                                setEditing({date: d, start, slot, selectedTechIds: [], capacity: slot?.capacity || 1});
                              }} 
                              disabled={isPast}
                              className={`px-2 py-1 rounded text-xs ${isPast ? 'bg-dark-300 text-text-muted cursor-not-allowed' : 'bg-lime-600 text-dark-900 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105'}`}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={()=>handleAutoAssign(d,start)} 
                              disabled={isPast}
                              className={`px-2 py-1 rounded text-xs ${isPast ? 'bg-dark-300 text-text-muted cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                            >
                              Auto Assign
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-4 p-4 border rounded-md bg-dark-300">
          <h4 className="text-text-muted mb-2">Assign technicians for {editing.date} {editing.start}</h4>
          
          {/* Capacity Configuration */}
          <div className="mb-4 p-3 bg-dark-900 border border-blue-200 rounded-md">
            <label className="block text-sm text-text-muted text-text-secondary mb-2">
              Slot Capacity (Max Appointments)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={editing.capacity}
              onChange={(e) => setEditing({ ...editing, capacity: parseInt(e.target.value) || 1 })}
              className="w-32 rounded-md bg-dark-300 text-white border-dark-300 shadow-sm focus:border-lime-400 focus:ring-lime-400"
            />
            <p className="text-xs text-text-secondary mt-1">
              How many appointments can be booked in this time slot
            </p>
          </div>
          
          {/* Quick selection buttons */}
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => {
                const allTechIds = technicians.map(t => t.technicianId?._id || t._id);
                setEditing({ ...editing, selectedTechIds: allTechIds });
              }}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Select All
            </button>
            <button
              onClick={() => setEditing({ ...editing, selectedTechIds: [] })}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Deselect All
            </button>
            <span className="text-xs text-text-muted self-center">
              {editing.selectedTechIds.length} of {technicians.length} selected
            </span>
          </div>
          
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {technicians.map(t => {
                const techId = t.technicianId?._id || t._id;
                const user = t.technicianId || t;
                const firstName = user.firstName || '';
                const lastName = user.lastName || '';
                const techName = `${firstName} ${lastName}`.trim() || user.email || 'Unknown';
                const isChecked = editing.selectedTechIds.includes(techId);
                
                return (
                  <label key={t._id} className="flex items-center space-x-2 cursor-pointer hover:bg-dark-900 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newSelectedIds = e.target.checked
                          ? [...editing.selectedTechIds, techId]
                          : editing.selectedTechIds.filter(id => id !== techId);
                        console.log('Checkbox changed:', { techId, checked: e.target.checked, newSelectedIds });
                        setEditing({ ...editing, selectedTechIds: newSelectedIds });
                      }}
                      className="rounded bg-dark-300 text-white border-dark-300 text-lime-600 focus:ring-lime-400"
                    />
                    <span className="text-sm">{techName}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                console.log('Save button clicked with selectedTechIds and capacity:', editing.selectedTechIds, editing.capacity);
                await handleAssign(editing.date, editing.start, editing.selectedTechIds, editing.capacity);
              }}
              className="px-4 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-100 transition-all duration-200 transform hover:scale-105"
            >
              Save
            </button>
            <button 
              onClick={() => setEditing(null)} 
              className="px-4 py-2 bg-dark-200 text-text-secondary rounded-md hover:bg-dark-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        /* NEW: Pre-bookings Tab */
        <div className="space-y-4">
          {loadingPreBookings ? (
            <div className="flex items-center justify-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-lime-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="ml-3 text-text-secondary">Đang tải...</span>
            </div>
          ) : preBookings.length === 0 ? (
            <div className="bg-dark-900 rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-text-secondary text-lg">Không có pre-booking nào</p>
              <p className="text-gray-500 text-sm mt-2">
                Các lịch hẹn đặt trước (&gt;30 ngày) sẽ hiển thị ở đây
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {preBookings.map((appointment) => {
                const timeRangeInfo = TIME_RANGE_MAP[appointment.preBookingDetails?.requestedTimeRange] || TIME_RANGE_MAP.morning;

                return (
                  <div
                    key={appointment._id}
                    className="bg-dark-900 rounded-lg p-4 border border-dark-700 hover:border-lime-500 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-lg font-bold text-lime-400">
                            #{appointment.appointmentNumber}
                          </span>
                          <span className="px-2 py-1 bg-blue-900 bg-opacity-30 border border-blue-500 rounded text-xs text-blue-300">
                            Pre-booking
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs mb-1">Khách hàng</p>
                            <p className="text-white font-semibold">
                              {appointment.customerId?.firstName} {appointment.customerId?.lastName}
                            </p>
                            <p className="text-gray-500 text-xs">{appointment.customerId?.phone}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 text-xs mb-1">Xe</p>
                            <p className="text-white font-semibold">
                              {appointment.vehicleId?.make} {appointment.vehicleId?.model}
                            </p>
                            <p className="text-gray-500 text-xs">{appointment.vehicleId?.licensePlate}</p>
                          </div>

                          <div>
                            <p className="text-gray-400 text-xs mb-1">Ngày & Buổi mong muốn</p>
                            <p className="text-white font-semibold">
                              {new Date(appointment.preBookingDetails?.requestedDate).toLocaleDateString('vi-VN', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-lime-400 text-xs flex items-center gap-1 mt-1">
                              <span>{timeRangeInfo.icon}</span>
                              {timeRangeInfo.label} ({timeRangeInfo.hours})
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPreBooking(appointment);
                          setShowAssignModal(true);
                        }}
                        className="ml-4 px-4 py-2 bg-lime-600 text-dark-900 rounded-md hover:bg-lime-500 font-semibold text-sm transition-all duration-200 transform hover:scale-105"
                      >
                        Phân công Slot
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NEW: Assign Slot Modal */}
      <AssignSlotModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedPreBooking(null);
        }}
        appointment={selectedPreBooking}
        onSuccess={handleAssignSuccess}
      />
    </div>
  );
};

export default SlotManager;
