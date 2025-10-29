import React, { useEffect, useState } from 'react';
import { slotsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// Weekly timetable: days across (Mon..Sun), times vertically. 2-hour slots 08-10,10-12,13-15,15-17
const TechnicianSlots: React.FC = () => {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState<string>(() => {
        // ISO date for Monday of current week
        const d = new Date();
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
        const monday = new Date(d);
        monday.setDate(d.getDate() + diff);
        return monday.toISOString().slice(0, 10);
    });

    // slots indexed by date (YYYY-MM-DD) -> startHH:MM -> slot
    const [slotsWeekMap, setSlotsWeekMap] = useState<Record<string, Record<string, any>>>({});

    const slotRanges = [['08:00', '10:00'], ['10:00', '12:00'], ['13:00', '15:00'], ['15:00', '17:00']];

    useEffect(() => { fetchSlotsForWeek(); }, [weekStart, user]);

    const getWeekDates = () => {
        const start = new Date(weekStart);
        const days = [] as string[];
        for (let i = 0; i < 6; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d.toISOString().slice(0, 10)); }
        return days;
    };

    const getTechName = (slot: any) => {
        // Nếu không có slot hoặc không có thợ máy được gán, trả về dấu gạch ngang
        if (!slot || !slot.technicianIds || slot.technicianIds.length === 0) {
            return <span className="text-text-muted">—</span>;
        }

        // Backend đã `populate` sẵn, nên technicianIds là một mảng object.
        // Chúng ta chỉ cần lặp qua và lấy tên.
        return slot.technicianIds.map((tech: any, index: number) => {
            // Đảm bảo tech là một object hợp lệ
            let techName = '';
            let techId = '';

            if (typeof tech === 'object' && tech !== null) {
                const fullName = `${tech.firstName || ''} ${tech.lastName || ''}`.trim();
                techName = fullName || tech.email || tech._id;
                techId = tech._id || tech.id;
            } else {
                techName = tech.toString();
                techId = tech.toString();
            }

            // Check if this is the current user
            const isCurrentUser = user?._id === techId;

            return (
                <span key={techId}>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isCurrentUser
                            ? 'bg-lime-200 text-dark-900 border-2 border-lime-400 shadow-sm'
                            : 'bg-dark-200 text-text-secondary'
                    }`}>
                        {isCurrentUser && <span className="mr-1">👤</span>}
                        {techName}
                        {isCurrentUser && <span className="ml-1 text-lime-600 font-bold">(You)</span>}
                    </span>
                    {index < slot.technicianIds.length - 1 && <span className="mx-1 text-text-muted">•</span>}
                </span>
            );
        });
    };

    const fetchSlotsForWeek = async () => {
        if (!user?._id) return;

        try {
            const days = getWeekDates();
            const from = `${days[0]}`; const to = `${days[days.length - 1]}`;
            // Filter slots by current technician
            const res = await slotsAPI.list({ from, to, technicianId: user._id });

            console.log('API Response for technician slots:', res);
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

            console.log('Fetched technician slots:', arr.length);

            arr.forEach((s: any) => {
                // Use the date and startTime fields directly from the slot
                const dateKey = s.date; // Already in YYYY-MM-DD format
                const timeKey = s.startTime; // Already in HH:MM format

                console.log(`Mapping technician slot: ${dateKey} ${timeKey}`, s);

                map[dateKey] = map[dateKey] || {};
                map[dateKey][timeKey] = s;
            });

            console.log('Technician slots map:', map);
            setSlotsWeekMap(map);
        } catch (err) { console.error(err); setSlotsWeekMap({}); }
    };

    const days = getWeekDates();

    return (
        <div className="bg-dark-300 p-4">
            <h3 className="text-text-secondary mt-2">My Working Slots — Weekly Timetable</h3>

            <div className="flex items-center gap-4 mb-4">
                <label className="text-sm text-text-secondary">Week start (Mon)</label>
                <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="rounded-md border-dark-300" />
            </div>

            <div className="overflow-auto border rounded-md bg-dark-300">
                <table className="min-w-full table-auto">
                    <thead>
                        <tr>
                            <th className="border px-2 py-2 text-text-muted">Time</th>
                            {days.map(d => (
                                <th key={d} className="border px-2 py-2 text-text-muted">{new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {slotRanges.map(([start, end]) => (
                            <tr key={start}>
                                <td className="border px-2 py-2 text-text-muted ">{start} — {end}</td>
                                {days.map(d => {
                                    const slot = slotsWeekMap[d]?.[start] || null;
                                    const slotDateTime = new Date(`${d}T${start}`);
                                    const isPast = slotDateTime < new Date();
                                    return (
                                        <td key={`${d}-${start}`} className={`border px-2 py-2 text-text-muted align-top ${slot ? 'bg-dark-300' : ''}`}>
                                            {slot ? (
                                                <div className="bg-dark-300 rounded-lg shadow-sm border p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs text-text-muted ${
                                                            slot.status === 'active' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : slot.status === 'full'
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-dark-100 text-gray-800'
                                                        }`}>
                                                            <span className={`w-2 h-2 rounded-full mr-1 ${
                                                                slot.status === 'active' 
                                                                    ? 'bg-green-400' 
                                                                    : slot.status === 'full'
                                                                    ? 'bg-red-400'
                                                                    : 'bg-dark-400'
                                                            }`}></span>
                                                            {slot.status}
                                                        </span>
                                                        <span className="text-xs text-text-muted">
                                                            {slot.bookedCount || 0}/{slot.capacity}
                                                        </span>
                                                    </div>
                                                    <div className="mb-2">
                                                        <div className="text-sm text-text-muted text-text-secondary mb-2">Technicians:</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getTechName(slot)}
                                                        </div>
                                                    </div>
                                                    <div className={`text-xs text-text-muted ${isPast ? 'text-orange-600' : 'text-lime-600'}`}>
                                                        {isPast ? '✓ Completed' : '⏰ Scheduled'}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-text-muted italic text-center py-4">
                                                    No slot assigned
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TechnicianSlots;
