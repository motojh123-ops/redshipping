import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/auth/Login';
import { DashboardOverview } from '../pages/dashboard/DashboardOverview';
import { ShipmentList } from '../pages/shipments/ShipmentList';
import { ShipmentDetails } from '../pages/shipments/ShipmentDetails';
import { QuotationList } from '../pages/quotations/QuotationList';
import { QuotationDetails } from '../pages/quotations/QuotationDetails';
import { CustomsList } from '../pages/customs/CustomsList';
import { CustomsDossierDetails } from '../pages/customs/CustomsDossierDetails';
import { ClientList } from '../pages/clients/ClientList';
import { ClientDetails } from '../pages/clients/ClientDetails';
import { InvoiceList } from '../pages/invoices/InvoiceList';
import { InvoiceDetails } from '../pages/invoices/InvoiceDetails';
import { ChargeItemsPage } from '../pages/masters/ChargeItemsPage';
import { PortsPage } from '../pages/masters/PortsPage';
import { ShippingLinesPage } from '../pages/masters/ShippingLinesPage';
import { OverseasAgentsPage } from '../pages/masters/OverseasAgentsPage';
import { VendorsPage } from '../pages/masters/VendorsPage';
import { DriversPage } from '../pages/masters/DriversPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { PricingMatrixPage } from '../pages/pricing/PricingMatrixPage';
import { StatementOfAccountPage } from '../pages/financials/StatementOfAccountPage';
import { DisbursementVouchersPage } from '../pages/financials/DisbursementVouchersPage';
import { TrackingPortalPage } from '../pages/tracking/TrackingPortalPage';
import { DispatchBoardPage } from '../pages/dispatch/DispatchBoardPage';
import { ReportsDashboardPage } from '../pages/reports/ReportsDashboardPage';
import { NotificationsCenterPage } from '../pages/notifications/NotificationsCenterPage';
import { LeadsPipelinePage } from '../pages/crm/LeadsPipelinePage';
import { WorldDirectoryPage } from '../pages/masters/WorldDirectoryPage';
import { UserProfilePage } from '../pages/profile/UserProfilePage';
import { LogisticsToolsSuitePage } from '../pages/tools/LogisticsToolsSuitePage';

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/track" element={<TrackingPortalPage />} />

      {/* Protected App Routes */}
      <Route element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardOverview />} />

        {/* Shipments / Operations Hub */}
        <Route path="shipments" element={<ShipmentList />} />
        <Route path="shipments/:id" element={<ShipmentDetails />} />
        <Route path="dispatch" element={<DispatchBoardPage />} />
        <Route path="tracking" element={<TrackingPortalPage />} />
        <Route path="tools" element={<LogisticsToolsSuitePage />} />
        <Route path="tools/:tab" element={<LogisticsToolsSuitePage />} />

        {/* Quotations / Pricing Desk */}
        <Route path="pricing" element={<PricingMatrixPage />} />
        <Route path="quotations" element={<QuotationList />} />
        <Route path="quotations/:id" element={<QuotationDetails />} />

        {/* Customs Clearance */}
        <Route path="customs" element={<CustomsList />} />
        <Route path="customs/:id" element={<CustomsDossierDetails />} />

        {/* Clients / CRM */}
        <Route path="clients" element={<ClientList />} />
        <Route path="clients/:id" element={<ClientDetails />} />
        <Route path="crm/pipeline" element={<LeadsPipelinePage />} />
        <Route path="pipeline" element={<LeadsPipelinePage />} />

        {/* Invoices / Financials / SOA / Disbursements */}
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/:id" element={<InvoiceDetails />} />
        <Route path="statement-of-account" element={<StatementOfAccountPage />} />
        <Route path="disbursements" element={<DisbursementVouchersPage />} />
        <Route path="financials/disbursements" element={<DisbursementVouchersPage />} />

        {/* Masters & Tariff Management */}
        <Route path="masters" element={<ChargeItemsPage />} />
        <Route path="masters/cities" element={<Navigate to="/masters/directory" replace />} />
        <Route path="masters/directory" element={<WorldDirectoryPage />} />
        <Route path="directory" element={<WorldDirectoryPage />} />
        <Route path="masters/charge-items" element={<ChargeItemsPage />} />
        <Route path="masters/ports" element={<PortsPage />} />
        <Route path="masters/shipping-lines" element={<ShippingLinesPage />} />
        <Route path="masters/overseas-agents" element={<OverseasAgentsPage />} />
        <Route path="masters/vendors" element={<VendorsPage />} />
        <Route path="masters/drivers" element={<DriversPage />} />

        {/* Reports & Analytics */}
        <Route path="reports" element={<ReportsDashboardPage />} />

        {/* Notifications Center */}
        <Route path="notifications" element={<NotificationsCenterPage />} />

        {/* Settings & Profile */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<UserProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
