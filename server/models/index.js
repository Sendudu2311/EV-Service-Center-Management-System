// Import all models
import "./User.js";
import "./Service.js";
import "./Appointment.js";
import "./Part.js";
import "./TechnicianProfile.js";
import "./ServiceReception.js";
import "./EVChecklist.js";
import "./Vehicle.js";
import "./PartRequest.js";
import "./PartConflict.js";
import "./Invoice.js";
import "./VNPAYTransaction.js";
import "./Slot.js";
import "./Contact.js";

// Import new transaction models
import "./Transaction.js";
import "./transactions/VNPAYTransaction.js";
import "./transactions/CashTransaction.js";
import "./transactions/CardTransaction.js";
import "./transactions/BankTransferTransaction.js";

// Export for convenience
export { default as User } from "./User.js";
export { default as Service } from "./Service.js";
export { default as Appointment } from "./Appointment.js";
export { default as Part } from "./Part.js";
export { default as TechnicianProfile } from "./TechnicianProfile.js";
export { default as ServiceReception } from "./ServiceReception.js";
export { default as EVChecklist } from "./EVChecklist.js";
export { default as Vehicle } from "./Vehicle.js";
export { default as PartRequest } from "./PartRequest.js";
export { default as PartConflict } from "./PartConflict.js";
export { default as Invoice } from "./Invoice.js";
export { default as VNPAYTransaction } from "./VNPAYTransaction.js";
export { default as Slot } from "./Slot.js";
export { default as Contact } from "./Contact.js";

// Export new transaction models
export { default as Transaction } from "./Transaction.js";
export { default as VNPAYTransactionNew } from "./transactions/VNPAYTransaction.js";
export { default as CashTransaction } from "./transactions/CashTransaction.js";
export { default as CardTransaction } from "./transactions/CardTransaction.js";
export { default as BankTransferTransaction } from "./transactions/BankTransferTransaction.js";
