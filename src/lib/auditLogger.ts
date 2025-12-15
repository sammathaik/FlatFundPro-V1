import { supabase } from './supabase';

export interface AuditLogOptions {
  action: string;
  tableName: string;
  recordId?: string;
  entityName?: string;
  changes?: any;
  metadata?: any;
  status?: 'success' | 'failure' | 'warning';
  errorMessage?: string;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_action: options.action,
      p_table_name: options.tableName,
      p_record_id: options.recordId || null,
      p_entity_name: options.entityName || null,
      p_details: options.changes || null,
      p_metadata: options.metadata || null,
      p_status: options.status || 'success',
      p_error_message: options.errorMessage || null
    });

    if (error) {
      console.error('Error logging audit event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error logging audit event:', error);
    return null;
  }
}

export function logPaymentCreated(paymentId: string, paymentData: any) {
  return logAuditEvent({
    action: 'create',
    tableName: 'payment_submissions',
    recordId: paymentId,
    entityName: `Payment by ${paymentData.name} - ${paymentData.flat_number}`,
    changes: { new: paymentData },
    metadata: {
      amount: paymentData.payment_amount,
      payment_date: paymentData.payment_date
    }
  });
}

export function logPaymentUpdated(paymentId: string, oldData: any, newData: any) {
  return logAuditEvent({
    action: 'update',
    tableName: 'payment_submissions',
    recordId: paymentId,
    entityName: `Payment ${paymentId}`,
    changes: { old: oldData, new: newData }
  });
}

export function logPaymentApproved(paymentId: string, paymentData: any) {
  return logAuditEvent({
    action: 'approve',
    tableName: 'payment_submissions',
    recordId: paymentId,
    entityName: `Payment by ${paymentData.name}`,
    changes: { status: 'Approved' },
    metadata: {
      amount: paymentData.payment_amount
    }
  });
}

export function logPaymentRejected(paymentId: string, paymentData: any, reason?: string) {
  return logAuditEvent({
    action: 'reject',
    tableName: 'payment_submissions',
    recordId: paymentId,
    entityName: `Payment by ${paymentData.name}`,
    changes: { status: 'Rejected', reason },
    metadata: {
      amount: paymentData.payment_amount,
      reason
    }
  });
}

export function logPaymentDeleted(paymentId: string, paymentData: any) {
  return logAuditEvent({
    action: 'delete',
    tableName: 'payment_submissions',
    recordId: paymentId,
    entityName: `Payment by ${paymentData.name}`,
    changes: { deleted: paymentData }
  });
}

export function logBuildingCreated(buildingId: string, buildingData: any) {
  return logAuditEvent({
    action: 'create',
    tableName: 'buildings_blocks_phases',
    recordId: buildingId,
    entityName: `${buildingData.type}: ${buildingData.block_name}`,
    changes: { new: buildingData }
  });
}

export function logBuildingUpdated(buildingId: string, oldData: any, newData: any) {
  return logAuditEvent({
    action: 'update',
    tableName: 'buildings_blocks_phases',
    recordId: buildingId,
    entityName: `${newData.type}: ${newData.block_name}`,
    changes: { old: oldData, new: newData }
  });
}

export function logBuildingDeleted(buildingId: string, buildingData: any) {
  return logAuditEvent({
    action: 'delete',
    tableName: 'buildings_blocks_phases',
    recordId: buildingId,
    entityName: `${buildingData.type}: ${buildingData.block_name}`,
    changes: { deleted: buildingData }
  });
}

export function logApartmentCreated(apartmentId: string, apartmentData: any) {
  return logAuditEvent({
    action: 'create',
    tableName: 'apartments',
    recordId: apartmentId,
    entityName: apartmentData.apartment_name,
    changes: { new: apartmentData }
  });
}

export function logApartmentUpdated(apartmentId: string, oldData: any, newData: any) {
  return logAuditEvent({
    action: 'update',
    tableName: 'apartments',
    recordId: apartmentId,
    entityName: newData.apartment_name,
    changes: { old: oldData, new: newData }
  });
}

export function logCollectionCreated(collectionId: string, collectionData: any) {
  return logAuditEvent({
    action: 'create',
    tableName: 'expected_collections',
    recordId: collectionId,
    entityName: `${collectionData.payment_type} - ${collectionData.quarter} ${collectionData.financial_year}`,
    changes: { new: collectionData },
    metadata: {
      amount_due: collectionData.amount_due,
      due_date: collectionData.due_date
    }
  });
}

export function logCollectionUpdated(collectionId: string, oldData: any, newData: any) {
  return logAuditEvent({
    action: 'update',
    tableName: 'expected_collections',
    recordId: collectionId,
    entityName: `${newData.payment_type} - ${newData.quarter} ${newData.financial_year}`,
    changes: { old: oldData, new: newData }
  });
}

export function logCollectionDeleted(collectionId: string, collectionData: any) {
  return logAuditEvent({
    action: 'delete',
    tableName: 'expected_collections',
    recordId: collectionId,
    entityName: `${collectionData.payment_type} - ${collectionData.quarter} ${collectionData.financial_year}`,
    changes: { deleted: collectionData }
  });
}

export function logAdminLogin(adminEmail: string) {
  return logAuditEvent({
    action: 'login',
    tableName: 'admins',
    entityName: adminEmail,
    metadata: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
  });
}

export function logAdminLogout(adminEmail: string) {
  return logAuditEvent({
    action: 'logout',
    tableName: 'admins',
    entityName: adminEmail,
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
}

export function logSystemSettingUpdated(settingKey: string, oldValue: any, newValue: any) {
  return logAuditEvent({
    action: 'update',
    tableName: 'system_settings',
    entityName: settingKey,
    changes: { old: oldValue, new: newValue }
  });
}

export function logError(action: string, tableName: string, error: any, metadata?: any) {
  return logAuditEvent({
    action,
    tableName,
    status: 'failure',
    errorMessage: error.message || String(error),
    metadata: {
      ...metadata,
      error: error.toString(),
      stack: error.stack
    }
  });
}
