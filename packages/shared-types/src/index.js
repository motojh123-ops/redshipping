"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.DocumentCategory = exports.ActivityType = exports.VendorType = exports.InvoiceType = exports.InvoiceStatus = exports.ContainerStatus = exports.ContainerType = exports.ShipmentStage = exports.QuotationStatus = exports.Incoterm = exports.ShipmentType = exports.ClientStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["COMPANY_ADMIN"] = "company_admin";
    UserRole["SALES_REP"] = "sales_rep";
    UserRole["PRICING_OFFICER"] = "pricing_officer";
    UserRole["OPS_OFFICER"] = "ops_officer";
    UserRole["CLEARANCE_BROKER"] = "clearance_broker";
    UserRole["ACCOUNTANT"] = "accountant";
    UserRole["CLIENT_PORTAL"] = "client_portal";
    UserRole["AGENT_PORTAL"] = "agent_portal";
})(UserRole || (exports.UserRole = UserRole = {}));
var ClientStatus;
(function (ClientStatus) {
    ClientStatus["PROSPECT"] = "prospect";
    ClientStatus["ACTIVE"] = "active";
    ClientStatus["INACTIVE"] = "inactive";
    ClientStatus["BLACKLISTED"] = "blacklisted";
})(ClientStatus || (exports.ClientStatus = ClientStatus = {}));
var ShipmentType;
(function (ShipmentType) {
    ShipmentType["FCL"] = "fcl";
    ShipmentType["LCL"] = "lcl";
    ShipmentType["AIR"] = "air";
    ShipmentType["LAND"] = "land";
    ShipmentType["CLEARANCE_ONLY"] = "clearance_only";
})(ShipmentType || (exports.ShipmentType = ShipmentType = {}));
var Incoterm;
(function (Incoterm) {
    Incoterm["EXW"] = "EXW";
    Incoterm["FCA"] = "FCA";
    Incoterm["CPT"] = "CPT";
    Incoterm["CIP"] = "CIP";
    Incoterm["DAP"] = "DAP";
    Incoterm["DPU"] = "DPU";
    Incoterm["DDP"] = "DDP";
    Incoterm["FAS"] = "FAS";
    Incoterm["FOB"] = "FOB";
    Incoterm["CFR"] = "CFR";
    Incoterm["CIF"] = "CIF";
})(Incoterm || (exports.Incoterm = Incoterm = {}));
var QuotationStatus;
(function (QuotationStatus) {
    QuotationStatus["DRAFT"] = "draft";
    QuotationStatus["SENT"] = "sent";
    QuotationStatus["ACCEPTED"] = "accepted";
    QuotationStatus["REJECTED"] = "rejected";
    QuotationStatus["EXPIRED"] = "expired";
})(QuotationStatus || (exports.QuotationStatus = QuotationStatus = {}));
var ShipmentStage;
(function (ShipmentStage) {
    ShipmentStage["BOOKING_CONFIRMED"] = "booking_confirmed";
    ShipmentStage["CARGO_RECEIVED"] = "cargo_received";
    ShipmentStage["CUSTOMS_SUBMITTED"] = "customs_submitted";
    ShipmentStage["ACID_ISSUED"] = "acid_issued";
    ShipmentStage["IN_TRANSIT"] = "in_transit";
    ShipmentStage["ARRIVED_DESTINATION"] = "arrived_destination";
    ShipmentStage["CLEARANCE_IN_PROGRESS"] = "clearance_in_progress";
    ShipmentStage["RELEASE_ISSUED"] = "release_issued";
    ShipmentStage["OUT_FOR_DELIVERY"] = "out_for_delivery";
    ShipmentStage["DELIVERED"] = "delivered";
    ShipmentStage["CLOSED"] = "closed";
    ShipmentStage["CANCELLED"] = "cancelled";
})(ShipmentStage || (exports.ShipmentStage = ShipmentStage = {}));
var ContainerType;
(function (ContainerType) {
    ContainerType["GP_20"] = "20GP";
    ContainerType["GP_40"] = "40GP";
    ContainerType["HQ_40"] = "40HQ";
    ContainerType["HQ_45"] = "45HQ";
    ContainerType["REEFER_20"] = "20RF";
    ContainerType["REEFER_40"] = "40RF";
    ContainerType["FLAT_RACK"] = "FLAT_RACK";
    ContainerType["OPEN_TOP"] = "OPEN_TOP";
})(ContainerType || (exports.ContainerType = ContainerType = {}));
var ContainerStatus;
(function (ContainerStatus) {
    ContainerStatus["BOOKED"] = "booked";
    ContainerStatus["LOADED"] = "loaded";
    ContainerStatus["ON_BOARD"] = "on_board";
    ContainerStatus["DISCHARGED"] = "discharged";
    ContainerStatus["GATED_OUT"] = "gated_out";
    ContainerStatus["DELIVERED"] = "delivered";
    ContainerStatus["RETURNED_EMPTY"] = "returned_empty";
})(ContainerStatus || (exports.ContainerStatus = ContainerStatus = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["ISSUED"] = "issued";
    InvoiceStatus["PARTIALLY_PAID"] = "partially_paid";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var InvoiceType;
(function (InvoiceType) {
    InvoiceType["CLIENT_FREIGHT"] = "client_freight";
    InvoiceType["CLIENT_CLEARANCE"] = "client_clearance";
    InvoiceType["VENDOR_DISBURSEMENT"] = "vendor_disbursement";
})(InvoiceType || (exports.InvoiceType = InvoiceType = {}));
var VendorType;
(function (VendorType) {
    VendorType["TRUCKING"] = "trucking";
    VendorType["CLEARANCE"] = "clearance";
    VendorType["PORT_SERVICES"] = "port_services";
    VendorType["WAREHOUSING"] = "warehousing";
    VendorType["FUMIGATION"] = "fumigation";
    VendorType["INSPECTION"] = "inspection";
})(VendorType || (exports.VendorType = VendorType = {}));
var ActivityType;
(function (ActivityType) {
    ActivityType["CALL"] = "call";
    ActivityType["WHATSAPP"] = "whatsapp";
    ActivityType["EMAIL"] = "email";
    ActivityType["MEETING"] = "meeting";
    ActivityType["NOTE"] = "note";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var DocumentCategory;
(function (DocumentCategory) {
    DocumentCategory["BL"] = "bl";
    DocumentCategory["PACKING_LIST"] = "packing_list";
    DocumentCategory["COMMERCIAL_INVOICE"] = "commercial_invoice";
    DocumentCategory["ACID_CERT"] = "acid_cert";
    DocumentCategory["CERT_OF_ORIGIN"] = "cert_of_origin";
    DocumentCategory["EUR1"] = "eur1";
    DocumentCategory["CUSTOMS_DECLARATION"] = "customs_declaration";
    DocumentCategory["DELIVERY_ORDER"] = "delivery_order";
    DocumentCategory["DISBURSEMENT_RECEIPT"] = "disbursement_receipt";
    DocumentCategory["OTHER"] = "other";
})(DocumentCategory || (exports.DocumentCategory = DocumentCategory = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["INSERT"] = "INSERT";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
//# sourceMappingURL=index.js.map