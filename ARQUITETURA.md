# Arquitetura do Sistema de Agendamento Multi-Nicho (Firebase Firestore)

## 1. Modelagem de Dados (`tenants/{tenantId}/...`)

- **`tenants/{tenantId}`**: Configuração do estabelecimento (`slug`, `name`, `niche`, `settings`).
- **`tenants/{tenantId}/services/{serviceId}`**: Serviços oferecidos (`name`, `price`, `durationMinutes`, `bufferAfterMinutes`, `depositConfig`, `modality`).
- **`tenants/{tenantId}/professionals/{professionalId}`**: Profissionais (`name`, `roleTitle`, `workingHours`).
- **`tenants/{tenantId}/resources/{resourceId}`**: Salas, cabines, macas ou equipamentos.
- **`tenants/{tenantId}/schedule_blocks/{blockId}`**: Bloqueios de agenda (`startAt`, `endAt`, `reason`).
- **`tenants/{tenantId}/slot_locks/{lockId}`**: Travas atômicas de horário por fração de tempo (`prof_{id}_{YYYY-MM-DD}_{HH:mm}`) para impedir agendamentos duplicados concorrentes via `runTransaction`.
- **`tenants/{tenantId}/appointments/{appointmentId}`**: Agendamentos com dados desnormalizados de `client`, `professional`, `items`, `dateString` (`YYYY-MM-DD`), `startAt`, `endAt`, `busyUntil` e `status`.

## 2. Funções Principais (`src/firebase/appointments.js`)

1. **`createAppointment(tenantId, payload, slotIntervalMinutes)`**: Verifica conflitos de horário, cria travas em `slot_locks` e salva o agendamento atomicamente no Firestore via `runTransaction`.
2. **`subscribeToAppointments(tenantId, filters, onData, onError)`**: Escuta agendamentos em tempo real usando `onSnapshot`.
3. **`updateAppointmentStatus(tenantId, appointmentId, newStatus)`**: Atualiza o status (`confirmed`, `cancelled_by_tenant`, etc.) e libera as travas de horário caso seja cancelado.
