# Frontend Architecture - React + TypeScript + Vite

## Technology Stack

- **Framework**: React 18.3.1 with TypeScript 5.5.3
- **Build Tool**: Vite 5.4.2 (fast HMR, optimized builds)
- **Styling**: Tailwind CSS 3.4.1 with custom SPLASH theme
- **Routing**: React Router DOM 7.8.2
- **State Management**: Context API (AuthContext, SocketContext)
- **Data Fetching**: React Query (@tanstack/react-query 5.89.0)
- **Forms**: React Hook Form 7.62.0 with Zod 4.1.9 validation
- **HTTP Client**: Axios 1.12.0
- **Real-time**: Socket.io-client 4.8.1
- **Notifications**: React Hot Toast 2.6.0
- **UI Components**: Headless UI 2.2.7, Heroicons 2.2.0, Lucide React 0.344.0
- **Charts**: Recharts 3.2.0
- **Date Handling**: date-fns 4.1.0
- **Excel**: xlsx 0.18.5

## Directory Structure

```
src/
├── components/                # 57 React components
│   ├── Appointment/          # Booking, confirmation, cancellation
│   │   ├── AppointmentForm.tsx
│   │   ├── AppointmentDetails.tsx
│   │   ├── AppointmentConfirmation.tsx
│   │   ├── TechnicianSelection.tsx
│   │   ├── CancelRequestModal.tsx
│   │   └── RefundMethodSelector.tsx
│   ├── Chatbot/              # AI chatbot (Gemini)
│   ├── Checklist/            # EV inspection checklists
│   ├── Common/               # RoleGuard, GoogleLogin
│   ├── Dashboard/            # Role-based dashboards
│   │   ├── EnhancedCustomerDashboard.tsx
│   │   ├── StaffDashboard.tsx
│   │   ├── EnhancedTechnicianDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── Invoice/              # Invoice generation, display
│   ├── Layout/               # Navbar, Footer, Layout
│   ├── Parts/                # Parts inventory, requests
│   │   ├── PartsList.tsx
│   │   ├── PartForm.tsx
│   │   ├── PartBulkImport.tsx
│   │   ├── PartsRequestModal.tsx
│   │   └── PartsSelection.tsx
│   ├── Payment/              # Payment confirmation
│   ├── RealTime/             # Socket.io notifications
│   ├── ServiceReception/     # Service reception forms
│   │   ├── ServiceReceptionModal.tsx
│   │   ├── ServiceReceptionReview.tsx
│   │   └── EVChecklistTab.tsx
│   ├── Services/             # Service management
│   ├── Slots/                # Technician slot management
│   ├── Transactions/         # Transaction history
│   │   ├── CustomerTransactions.tsx
│   │   ├── StaffTransactionManagement.tsx
│   │   └── RecordPaymentModal.tsx
│   ├── UI/                   # Base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   └── Vehicle/              # Vehicle management
├── contexts/                  # React Context API
│   ├── AuthContext.tsx       # Authentication state
│   └── SocketContext.tsx     # Socket.io connection
├── hooks/                     # Custom React hooks
│   └── useDebouncedFetch.ts
├── pages/                     # 39 page components
│   ├── auth/                 # Login, Register, Password Reset
│   ├── Dashboard.tsx         # Role-based dashboard router
│   ├── Home.tsx              # Landing page
│   ├── AppointmentsPage.tsx  # Appointment management
│   ├── VehiclesPage.tsx      # Vehicle management
│   ├── PartsPage.tsx         # Parts inventory
│   ├── ServiceReceptionPage.tsx
│   ├── InvoicesPage.tsx
│   └── ReportsPage.tsx
├── services/                  # API service layer
│   └── api.ts                # Axios instance + interceptors
├── types/                     # TypeScript definitions
│   ├── appointment.ts        # 14 detailed + 6 core statuses
│   ├── parts.ts
│   ├── invoice.ts
│   ├── transaction.ts
│   ├── payment.ts
│   └── serviceReception.ts
├── utils/                     # Utility functions
│   ├── vietnamese.ts         # VND formatting, date formatting
│   ├── timezone.ts
│   ├── warranty.ts
│   └── safeHelpers.ts
├── styles/                    # Style utilities
│   ├── components.ts
│   └── theme.ts
├── App.tsx                    # Main app with routing
├── main.tsx                   # App entry point
└── index.css                  # Global styles + Tailwind
```

## Key Features

### 1. Authentication System (`src/contexts/AuthContext.tsx`)

```typescript
// Key functions
login(email, password)
loginWithGoogle(googleCredential)
register(userData)
logout()
updateProfile(profileData)
changePassword(oldPassword, newPassword)

// State
user: User | null
isAuthenticated: boolean
loading: boolean
```

**Features**:
- JWT token management with localStorage
- Auto-refresh on page load
- Role-based access control
- Google OAuth integration
- Automatic token injection in API calls

### 2. Protected Routes (`src/components/ProtectedRoute.tsx`)

```typescript
<ProtectedRoute allowedRoles={['customer']}>
  <CustomerDashboard />
</ProtectedRoute>
```

- Role-based route guarding
- Automatic redirect to login
- Loading states during auth check

### 3. Real-time Communication (`src/contexts/SocketContext.tsx`)

```typescript
// Socket Events
joinAppointment(appointmentId)
leaveAppointment(appointmentId)
sendMessage(appointmentId, message)
onAppointmentUpdate(callback)
onNewMessage(callback)
```

**Features**:
- Automatic reconnection logic
- Room-based messaging
- Status update broadcasting
- Online user tracking
- Vietnamese notifications

### 4. Routing Configuration (`src/App.tsx` - 383 lines)

#### Public Routes
- `/` - Home page
- `/login` - Login page
- `/register` - Register page
- `/about`, `/services`, `/contact` - Static pages

#### Customer Routes
- `/customer/dashboard` - Customer dashboard
- `/customer/vehicles` - Vehicle management
- `/customer/appointments` - Appointment booking/tracking
- `/customer/transactions` - Transaction history
- `/customer/service-history` - Past service records

#### Staff Routes
- `/staff/dashboard` - Staff dashboard
- `/staff/users` - User management
- `/staff/slots` - Slot management
- `/staff/manage-vehicles` - Vehicle management
- `/staff/invoices` - Invoice management
- `/staff/transactions` - Transaction management

#### Technician Routes
- `/technician/dashboard` - Technician dashboard
- `/technician/work-queue` - Assigned work
- `/technician/my-slots` - Slot schedule
- `/technician/service-reception` - Create reception forms

#### Admin Routes
- `/admin/dashboard` - Admin dashboard
- `/admin/service-centers` - Service center management
- `/admin/reports` - System reports
- `/admin/contact-management` - Contact inquiries

### 5. Role-Based Dashboards

#### Customer Dashboard
- Vehicle statistics (total, active, maintenance due)
- Upcoming appointments
- Recent service history
- Total spent
- Quick actions (book appointment, add vehicle)

#### Staff Dashboard
- Pending confirmations count
- Pending receptions count
- Today's appointments
- This week's appointments
- Pending part requests
- Quick actions (view all appointments, manage slots)

#### Technician Dashboard
- Assigned jobs count
- In-progress jobs
- Completed today
- Average completion time
- Performance rating
- Work queue with priorities
- Quick actions (view schedule, create reception)

#### Admin Dashboard
- Total users (by role)
- Total appointments (by status)
- Revenue metrics (month, week, day)
- Total vehicles
- Low stock parts
- Pending payments
- Overdue invoices
- System health indicators

### 6. Appointment Management

#### AppointmentForm.tsx (Multi-step booking)
**Steps**:
1. Select vehicle (or add new)
2. Select services
3. Choose date and time slot
4. Review and confirm
5. Payment (deposit: 200,000 VND)

**Features**:
- Real-time slot availability
- Pre-validation before booking
- VNPay payment integration
- Multiple vehicle selection
- Service package selection

#### AppointmentDetails.tsx
**Features**:
- Full appointment view
- Status timeline
- Service items
- Parts used
- Total amount
- Payment status
- Customer notes
- Internal notes (staff only)
- Service notes history
- Photos gallery
- Cancellation request (if applicable)

#### CancelRequestModal.tsx
**Cancellation Flow**:
1. Customer selects reason
2. System calculates refund percentage
3. Customer selects refund method (cash or bank transfer)
4. For bank transfer: upload bank account proof
5. Submit cancellation request
6. Wait for staff approval

**Refund Percentages**:
- More than 24h before: 100%
- 12-24h before: 70%
- 6-12h before: 50%
- Less than 6h: 30%

### 7. Service Reception System

#### ServiceReceptionModal.tsx (Complete reception form)
**Sections**:
1. **Vehicle Condition**:
   - Exterior (condition, damages, photos)
   - Interior (condition, cleanliness, damages)
   - Battery (level, health, temperature)
   - Mileage (current, odometer photo)

2. **Diagnostics**:
   - Reported issues (customer complaints)
   - Technician observations
   - Diagnostic tests
   - Recommendations

3. **Parts Request**:
   - Select parts needed
   - Check availability
   - Reason for each part

4. **Photos**:
   - Damage photos
   - Odometer photo
   - Other documentation

#### EVChecklistTab.tsx
**EV-Specific Checks**:
- Battery diagnostics
- Charging system inspection
- High-voltage safety
- Motor inspection
- Electronics check
- Cooling system
- Fire extinguisher
- PPE availability

### 8. Parts Management

#### PartsList.tsx
**Features**:
- Real-time inventory display
- Search by name, part number, category
- Filter by category, subcategory, brand
- Sort by name, price, stock
- Stock status indicators (in stock, low stock, out of stock)
- Quick actions (edit, reserve, restock)

#### PartBulkImport.tsx
**Excel Import**:
1. Download template
2. Fill in part data
3. Upload Excel file
4. System validates data
5. Preview import
6. Confirm import
7. Report success/errors

**Supported Fields**:
- Part number, name, description
- Category, subcategory, brand
- Pricing (cost, retail, wholesale)
- Inventory (current stock, min/max levels)
- Compatibility (makes, models, years)
- Specifications (voltage, capacity, etc.)

#### PartsRequestModal.tsx
**Request Types**:
- `initial_service`: During service reception
- `additional_during_service`: During service work

**Flow**:
1. Search and select parts
2. Specify quantity and reason
3. System checks availability
4. Submit request
5. Wait for staff approval
6. If approved: parts reserved
7. If shortage: staff suggests alternatives

### 9. Invoice & Payment

#### InvoiceGenerationModal.tsx
**Invoice Generation**:
1. Service items (from appointment.services)
2. Parts used (from partsUsed array)
3. Labor cost calculation
4. Subtotal calculation
5. Apply 10% VAT
6. Apply discount (if any)
7. Generate invoice number: `INV + YYYYMMDD + sequence`
8. Send email to customer

#### InvoicePreview.tsx
**Display**:
- Company information (with tax code)
- Customer information
- Vehicle information
- Service items table (service, quantity, unit price, total)
- Parts items table (part, quantity, unit price, total)
- Subtotal
- VAT (10%)
- Discount (if any)
- Total amount in VND format
- Payment information
- QR code for VNPay payment

#### PaymentConfirmationModal.tsx
**Payment Methods**:
- **VNPay**: Redirect to VNPay gateway
- **Cash**: Record payment at service center
- **Card**: POS terminal at service center
- **Bank Transfer**: Transfer to company account

**Features**:
- Upload payment proof image
- Enter payment details
- Confirmation message
- Receipt generation

### 10. Transaction Management

#### CustomerTransactions.tsx
**Features**:
- Transaction history (all payment methods)
- Filter by status, type, date range
- Search by transaction reference
- View transaction details
- View payment proof
- Export to Excel

**Transaction Statuses**:
- Pending (yellow)
- Processing (blue)
- Completed (green)
- Failed (red)
- Refunded (purple)

#### StaffTransactionManagement.tsx
**Staff Functions**:
- View all customer transactions
- Update transaction status
- Record offline payments (cash, card, bank)
- Upload payment proof
- Process refunds
- View settlement information
- Export transactions

#### RecordPaymentModal.tsx
**Offline Payment Recording**:
1. Select payment method (cash, card, bank transfer)
2. Enter amount
3. Upload payment proof
4. Enter notes
5. Submit payment record
6. System creates transaction
7. Updates invoice status

### 11. UI Components & Theme

#### Custom Tailwind Theme (`tailwind.config.js`)
**SPLASH Theme**:
- Primary: Neon Lime (#CCFF00)
- Background: Dark Mode (#0F1419)
- Dark palette: dark-50 to dark-900
- Lime accent colors with glow effects

**Custom Classes**:
```css
.card-splash - Dark card with lime border
.btn-lime-primary - Lime button with glow
.input-splash - Dark input with lime focus
.glass-effect - Glass morphism
.gradient-lime - Lime gradient background
```

#### Base UI Components
- **Button.tsx**: Multiple variants (primary, secondary, danger, ghost, outline)
- **Card.tsx**: Dark mode cards with hover effects
- **Input.tsx**: Styled inputs with validation states
- **Badge.tsx**: Status badges with colors
- **Modal**: Overlay modals with animations
- **Dropdown**: Accessible dropdown menus

### 12. Vietnamese Localization

#### Currency Formatting (`src/utils/vietnamese.ts`)
```typescript
formatVND(123456789) // "123.456.789 ₫"
```

#### Date Formatting
```typescript
formatVietnameseDate(date) // "30/10/2024"
formatVietnameseDateTime(date) // "30/10/2024 15:30"
```

#### Status Translations (`src/types/appointment.ts`)
```typescript
const statusTranslations = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  customer_arrived: "Khách hàng đã đến",
  reception_created: "Đã tạo phiếu tiếp nhận",
  reception_approved: "Đã duyệt phiếu tiếp nhận",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  invoiced: "Đã xuất hóa đơn",
  cancelled: "Đã hủy"
}
```

### 13. API Service Layer (`src/services/api.ts`)

#### Axios Instance
```typescript
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000
});

// Request interceptor - inject JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Auto logout
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

#### API Modules
```typescript
// Authentication
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

// Appointments
export const appointmentAPI = {
  getAll: (filters) => api.get('/appointments', { params: filters }),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  confirmByStaff: (id) => api.put(`/appointments/${id}/staff-confirm`),
  checkIn: (id) => api.put(`/appointments/${id}/customer-arrived`),
  requestCancel: (id, data) => api.post(`/appointments/${id}/request-cancel`, data)
};

// Parts
export const partAPI = {
  getAll: (filters) => api.get('/parts', { params: filters }),
  checkAvailability: (parts) => api.get('/parts/check-availability', { params: { parts } }),
  bulkImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/parts/bulk-import', formData);
  }
};

// Invoices
export const invoiceAPI = {
  generate: (data) => api.post('/invoices', data),
  getById: (id) => api.get(`/invoices/${id}`),
  confirmPayment: (id, data) => api.post(`/invoices/${id}/payment`, data),
  uploadProof: (id, file) => {
    const formData = new FormData();
    formData.append('proof', file);
    return api.post(`/invoices/${id}/upload-proof`, formData);
  }
};
```

### 14. Type Safety (TypeScript)

#### Appointment Types (`src/types/appointment.ts` - 433 lines)
```typescript
export type DetailedAppointmentStatus =
  | "pending" | "confirmed" | "customer_arrived"
  | "reception_created" | "reception_approved"
  | "in_progress" | "completed" | "invoiced"
  | "cancelled" | "no_show" | "parts_insufficient"
  | "waiting_for_parts" | "rescheduled" | "parts_requested";

export type CoreAppointmentStatus =
  | "Scheduled" | "CheckedIn" | "InService"
  | "OnHold" | "ReadyForPickup" | "Closed";

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  customerId: string;
  vehicleId: string;
  services: ServiceItem[];
  bookingType: 'deposit_booking' | 'full_service';
  depositInfo: DepositInfo;
  scheduledDate: string;
  scheduledTime: string;
  status: DetailedAppointmentStatus;
  coreStatus: CoreAppointmentStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTechnician?: string;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  cancelRequest?: CancelRequest;
  // ... many more fields
}
```

#### Parts Types (`src/types/parts.ts`)
```typescript
export interface Part {
  _id: string;
  partNumber: string;
  name: string;
  category: PartCategory;
  subcategory?: string;
  pricing: {
    cost: number;
    retail: number;
    wholesale: number;
  };
  inventory: {
    currentStock: number;
    reservedStock: number;
    availableStock: number;
    minStockLevel: number;
    reservations: Reservation[];
  };
  compatibility: {
    makes: string[];
    models: string[];
    years: { min: number; max: number };
  };
  // ... more fields
}

export interface PartRequest {
  _id: string;
  requestNumber: string;
  type: 'initial_service' | 'additional_during_service';
  appointmentId: string;
  requestedParts: RequestedPart[];
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'fulfilled';
  reviewDetails?: ReviewDetails;
  // ... more fields
}
```

### 15. Performance Optimizations

#### React Query Caching
```typescript
// Cache appointments for 5 minutes
const { data: appointments } = useQuery({
  queryKey: ['appointments', filters],
  queryFn: () => appointmentAPI.getAll(filters),
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000
});
```

#### Debounced Search
```typescript
const useDebouncedFetch = (searchTerm, fetchFn, delay = 500) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      const result = await fetchFn(searchTerm);
      setData(result);
      setLoading(false);
    }, delay);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  return { data, loading };
};
```

#### Lazy Loading Routes
```typescript
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Reports = lazy(() => import('./pages/ReportsPage'));

<Suspense fallback={<LoadingSpinner />}>
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
</Suspense>
```

#### Image Optimization
- Cloudinary automatic optimization
- Lazy loading with Intersection Observer
- Thumbnail generation
- WebP format support

## Common Patterns

### 1. Form Handling with React Hook Form + Zod
```typescript
const schema = z.object({
  vehicleId: z.string().min(1, "Vui lòng chọn xe"),
  services: z.array(z.string()).min(1, "Vui lòng chọn dịch vụ"),
  scheduledDate: z.string(),
  scheduledTime: z.string()
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

### 2. Protected API Calls
```typescript
const fetchAppointments = async () => {
  try {
    const response = await appointmentAPI.getAll(filters);
    setAppointments(response.data.data);
  } catch (error) {
    if (error.response?.status === 401) {
      toast.error("Phiên đăng nhập hết hạn");
      logout();
    } else {
      toast.error(error.response?.data?.message || "Lỗi khi tải dữ liệu");
    }
  }
};
```

### 3. Real-time Updates
```typescript
useEffect(() => {
  if (!appointmentId) return;

  socket.joinAppointment(appointmentId);

  socket.onAppointmentUpdate((update) => {
    setAppointment(prev => ({ ...prev, ...update }));
    toast.success(`Trạng thái: ${update.status}`);
  });

  return () => {
    socket.leaveAppointment(appointmentId);
  };
}, [appointmentId]);
```

### 4. File Upload
```typescript
const handleImageUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.url;
  } catch (error) {
    toast.error("Lỗi khi tải ảnh lên");
    throw error;
  }
};
```

## Build Configuration

### Vite Config (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@headlessui/react', '@heroicons/react'],
          'charts': ['recharts']
        }
      }
    }
  }
});
```

### TypeScript Config (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```