import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  runTransaction,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';

export const DEFAULT_TENANT_ID = 'atelier-lumiere';
export const DEFAULT_PROFESSIONAL = {
  id: 'prof-1',
  name: 'Camila Andrade (Master Nail)',
};

export const INITIAL_SERVICES = [
  {
    id: 'srv-1',
    name: 'Alongamento em Fibra de Vidro',
    category: 'Alongamento',
    description: 'Unhas longas, resistentes e com curvatura natural impecável. Inclui cutilagem russa e esmaltação em gel.',
    priceCents: 16000,
    priceFormatted: 'R$ 160,00',
    durationMinutes: 120,
    duration: '2h 00m',
    bufferAfterMinutes: 15,
    popular: true,
    active: true,
  },
  {
    id: 'srv-2',
    name: 'Manutenção de Fibra / Gel',
    category: 'Manutenção',
    description: 'Realinhamento da estrutura, reposição de produto, nivelamento de cutícula e troca de arte ou cor.',
    priceCents: 11000,
    priceFormatted: 'R$ 110,00',
    durationMinutes: 90,
    duration: '1h 30m',
    bufferAfterMinutes: 15,
    popular: false,
    active: true,
  },
  {
    id: 'srv-3',
    name: 'Banho de Gel (Blindagem)',
    category: 'Proteção Natural',
    description: 'Camada protetora de gel sobre a unha natural para evitar quebras e garantir esmaltação intacta por 21 dias.',
    priceCents: 9500,
    priceFormatted: 'R$ 95,00',
    durationMinutes: 75,
    duration: '1h 15m',
    bufferAfterMinutes: 15,
    popular: true,
    active: true,
  },
  {
    id: 'srv-4',
    name: 'Esmaltação em Gel + Manicure Russa',
    category: 'Estética & Brilho',
    description: 'Cutilagem a seco com brocas diamantadas e esmalte em gel com secagem imediata em cabine LED/UV.',
    priceCents: 7500,
    priceFormatted: 'R$ 75,00',
    durationMinutes: 60,
    duration: '1h 00m',
    bufferAfterMinutes: 15,
    popular: false,
    active: true,
  },
  {
    id: 'srv-5',
    name: 'Spa dos Pés + Pedicure Gel',
    category: 'Relaxamento',
    description: 'Esfoliação botânica, hidratação profunda com parafina morna, massagem relaxante e esmaltação duradoura.',
    priceCents: 8500,
    priceFormatted: 'R$ 85,00',
    durationMinutes: 75,
    duration: '1h 15m',
    bufferAfterMinutes: 15,
    popular: false,
    active: true,
  },
  {
    id: 'srv-6',
    name: 'Nail Art Encapsulada / Francesa Reversa',
    category: 'Arte Exclusiva',
    description: 'Design artístico personalizado com folhas de ouro, glitter fino, madrepérola ou francesa reversa estruturada.',
    priceCents: 18500,
    priceFormatted: 'R$ 185,00',
    durationMinutes: 150,
    duration: '2h 30m',
    bufferAfterMinutes: 15,
    popular: true,
    active: true,
  },
];

export const ACTIVE_STATUSES = [
  'pending_deposit',
  'pending_approval',
  'confirmed',
  'checked_in',
  'in_progress',
];

const STORAGE_APPT_KEY = 'bplanner_appointments_demo_v1';
const STORAGE_SRV_KEY = 'bplanner_services_demo_v1';
const syncChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bplanner_realtime_sync') : null;
const localListeners = new Set();
const localServiceListeners = new Set();

let cloudPollingInterval = null;
let lastCloudSignature = '';

function hydrateTimestamp(ms) {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  };
}

function buildInitialMockAppointments() {
  const now = new Date();
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = toYMD(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = toYMD(tomorrow);

  const slot = (ymd, hh, mm, durMins) => {
    const start = new Date(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`).getTime();
    const end = start + durMins * 60000;
    const busy = end + 15 * 60000;
    return { startAtMs: start, endAtMs: end, busyUntilMs: busy };
  };

  return [
    {
      id: 'appt_demo_1',
      client: { id: 'cli_1', name: 'Beatriz Lima', phone: '(11) 98765-1100' },
      professional: DEFAULT_PROFESSIONAL,
      resourceIds: ['res-bench-1'],
      items: [{ serviceId: 'srv-1', serviceName: 'Alongamento em Fibra de Vidro', price: 16000, durationMinutes: 120, bufferAfterMinutes: 15 }],
      dateString: todayStr,
      ...slot(todayStr, 9, 0, 120),
      status: 'completed',
      pricing: { subtotal: 16000, discount: 0, total: 16000, depositRequired: 4800, depositPaid: 4800, paymentStatus: 'paid' },
      customDetails: { nailShape: 'Amendoado', observations: 'Cliente prefere formato amendoado clássico.' },
    },
    {
      id: 'appt_demo_2',
      client: { id: 'cli_2', name: 'Juliana Mendes', phone: '(11) 98765-2200' },
      professional: DEFAULT_PROFESSIONAL,
      resourceIds: ['res-bench-1'],
      items: [{ serviceId: 'srv-2', serviceName: 'Manutenção de Fibra / Gel', price: 11000, durationMinutes: 90, bufferAfterMinutes: 15 }],
      dateString: todayStr,
      ...slot(todayStr, 13, 30, 90),
      status: 'in_progress',
      pricing: { subtotal: 11000, discount: 0, total: 11000, depositRequired: 3300, depositPaid: 3300, paymentStatus: 'partial' },
      customDetails: { nailShape: 'Bailarina', observations: 'Troca de esmaltação em gel para tom nude rosado.' },
    },
    {
      id: 'appt_demo_3',
      client: { id: 'cli_3', name: 'Fernanda Rocha', phone: '(11) 98765-3300' },
      professional: DEFAULT_PROFESSIONAL,
      resourceIds: ['res-bench-1'],
      items: [{ serviceId: 'srv-6', serviceName: 'Nail Art Encapsulada / Francesa Reversa', price: 18500, durationMinutes: 150, bufferAfterMinutes: 15 }],
      dateString: todayStr,
      ...slot(todayStr, 16, 0, 150),
      status: 'confirmed',
      pricing: { subtotal: 18500, discount: 0, total: 18500, depositRequired: 5550, depositPaid: 5550, paymentStatus: 'partial' },
      customDetails: { nailShape: 'Stiletto', observations: 'Francesa reversa com detalhes dourados.' },
    },
    {
      id: 'appt_demo_4',
      client: { id: 'cli_4', name: 'Larissa Souza', phone: '(11) 98765-4400' },
      professional: DEFAULT_PROFESSIONAL,
      resourceIds: ['res-bench-1'],
      items: [{ serviceId: 'srv-3', serviceName: 'Banho de Gel (Blindagem)', price: 9500, durationMinutes: 75, bufferAfterMinutes: 15 }],
      dateString: tomorrowStr,
      ...slot(tomorrowStr, 10, 0, 75),
      status: 'confirmed',
      pricing: { subtotal: 9500, discount: 0, total: 9500, depositRequired: 2850, depositPaid: 2850, paymentStatus: 'partial' },
      customDetails: { nailShape: 'Quadrado', observations: 'Primeira visita ao estúdio.' },
    },
    {
      id: 'appt_demo_5',
      client: { id: 'cli_5', name: 'Amanda Carvalho', phone: '(11) 98765-5500' },
      professional: DEFAULT_PROFESSIONAL,
      resourceIds: ['res-bench-1'],
      items: [{ serviceId: 'srv-1', serviceName: 'Alongamento em Fibra de Vidro', price: 16000, durationMinutes: 120, bufferAfterMinutes: 15 }],
      dateString: tomorrowStr,
      ...slot(tomorrowStr, 14, 0, 120),
      status: 'pending_approval',
      pricing: { subtotal: 16000, discount: 0, total: 16000, depositRequired: 4800, depositPaid: 0, paymentStatus: 'unpaid' },
      customDetails: { nailShape: 'Amendoado', observations: 'Aguardando confirmação de sinal via PIX.' },
    },
  ];
}

function getLocalAppointments() {
  try {
    const raw = localStorage.getItem(STORAGE_APPT_KEY);
    if (!raw) {
      const initial = buildInitialMockAppointments();
      localStorage.setItem(STORAGE_APPT_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0) {
      const initial = buildInitialMockAppointments();
      localStorage.setItem(STORAGE_APPT_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    return buildInitialMockAppointments();
  }
}

function saveLocalAppointments(list) {
  localStorage.setItem(STORAGE_APPT_KEY, JSON.stringify(list));
}

export function getLocalServices() {
  try {
    const raw = localStorage.getItem(STORAGE_SRV_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SRV_KEY, JSON.stringify(INITIAL_SERVICES));
      return INITIAL_SERVICES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SERVICES;
  }
}

function notifyLocalListeners(changeType = 'modified', changedAppt = null) {
  localListeners.forEach((cb) => cb(changeType, changedAppt));
  syncChannel?.postMessage({ scope: 'appointments', changeType, changedAppt });
}

function notifyLocalServiceListeners() {
  localServiceListeners.forEach((cb) => cb());
  syncChannel?.postMessage({ scope: 'services' });
}

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.scope === 'appointments') {
      localListeners.forEach((cb) => cb(event.data.changeType, event.data.changedAppt));
    } else if (event.data?.scope === 'services') {
      localServiceListeners.forEach((cb) => cb());
    }
  };
}

async function fetchFromCloudApi() {
  try {
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const signature = JSON.stringify(data);
    if (signature !== lastCloudSignature) {
      const hadPrevious = Boolean(lastCloudSignature);
      lastCloudSignature = signature;
      if (Array.isArray(data.appointments)) {
        saveLocalAppointments(data.appointments);
        localListeners.forEach((cb) => cb(hadPrevious ? 'added' : 'initial', null));
      }
      if (Array.isArray(data.services) && data.services.length > 0) {
        localStorage.setItem(STORAGE_SRV_KEY, JSON.stringify(data.services));
        localServiceListeners.forEach((cb) => cb());
      }
    }
    return data;
  } catch {
    return null;
  }
}

function ensureCloudPolling() {
  if (cloudPollingInterval || isFirebaseConfigured) return;
  fetchFromCloudApi();
  cloudPollingInterval = setInterval(() => {
    if (localListeners.size > 0 || localServiceListeners.size > 0) {
      fetchFromCloudApi();
    }
  }, 3000);
}

export function formatMinutesToDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

export function formatCentsToBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function subscribeToServices(tenantId = DEFAULT_TENANT_ID, onData) {
  if (!isFirebaseConfigured) {
    ensureCloudPolling();
    const emit = () => onData(getLocalServices().filter((s) => s.active !== false));
    emit();
    localServiceListeners.add(emit);
    return () => localServiceListeners.delete(emit);
  }

  const servicesRef = collection(db, 'tenants', tenantId, 'services');
  return onSnapshot(
    servicesRef,
    (snap) => {
      if (snap.empty) {
        onData(INITIAL_SERVICES);
        return;
      }
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.active !== false);
      onData(list);
    },
    () => {
      onData(getLocalServices().filter((s) => s.active !== false));
    }
  );
}

export async function createService(tenantId = DEFAULT_TENANT_ID, serviceData) {
  const priceCents = Math.round(Number(serviceData.priceReais) * 100);
  const durationMinutes = Number(serviceData.durationMinutes) || 60;

  const newService = {
    id: `srv-${Date.now()}`,
    name: serviceData.name.trim(),
    category: serviceData.category.trim() || 'Procedimento',
    description: serviceData.description.trim(),
    priceCents,
    priceFormatted: formatCentsToBRL(priceCents),
    durationMinutes,
    duration: formatMinutesToDuration(durationMinutes),
    bufferAfterMinutes: 15,
    popular: Boolean(serviceData.popular),
    active: true,
  };

  if (!isFirebaseConfigured) {
    const list = getLocalServices();
    list.push(newService);
    localStorage.setItem(STORAGE_SRV_KEY, JSON.stringify(list));
    notifyLocalServiceListeners();

    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'service', data: newService }),
    }).catch(() => {});

    return newService.id;
  }

  const servicesRef = collection(db, 'tenants', tenantId, 'services');
  const docRef = await addDoc(servicesRef, {
    ...newService,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteService(tenantId = DEFAULT_TENANT_ID, serviceId) {
  if (!isFirebaseConfigured) {
    const list = getLocalServices().filter((s) => s.id !== serviceId);
    localStorage.setItem(STORAGE_SRV_KEY, JSON.stringify(list));
    notifyLocalServiceListeners();

    await fetch('/api/sync', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'service', id: serviceId }),
    }).catch(() => {});

    return;
  }
  await deleteDoc(doc(db, 'tenants', tenantId, 'services', serviceId));
}

export function generateSlotKeys(startDate, endDate, intervalMinutes = 15) {
  const slots = [];
  const current = new Date(startDate.getTime());

  while (current < endDate) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const hh = String(current.getHours()).padStart(2, '0');
    const min = String(current.getMinutes()).padStart(2, '0');

    slots.push(`${yyyy}-${mm}-${dd}_${hh}:${min}`);
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

export async function createAppointment(tenantId = DEFAULT_TENANT_ID, payload, slotIntervalMinutes = 15) {
  const {
    client,
    professional = DEFAULT_PROFESSIONAL,
    resourceIds = [],
    items,
    startDate,
    modality = 'in_person',
    meetingUrl = null,
    discount = 0,
    depositRequired = 0,
    customDetails = {},
  } = payload;

  if (!(startDate instanceof Date) || isNaN(startDate)) {
    throw new Error('Data e horário de início inválidos.');
  }

  const totalDurationMin = items.reduce((acc, item) => acc + (item.durationMinutes || 60), 0);
  const totalBufferMin = items.reduce((acc, item) => acc + (item.bufferAfterMinutes || 0), 0);

  if (totalDurationMin <= 0) {
    throw new Error('A duração total dos serviços deve ser maior que zero.');
  }

  const endDate = new Date(startDate.getTime() + totalDurationMin * 60000);
  const busyUntilDate = new Date(endDate.getTime() + totalBufferMin * 60000);

  const dateString = [
    startDate.getFullYear(),
    String(startDate.getMonth() + 1).padStart(2, '0'),
    String(startDate.getDate()).padStart(2, '0'),
  ].join('-');

  const subtotal = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const total = Math.max(0, subtotal - discount);

  if (!isFirebaseConfigured) {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const busyMs = busyUntilDate.getTime();

    const newAppt = {
      id: `appt_${Date.now()}`,
      client: {
        id: client.id || `cli_${Date.now()}`,
        name: client.name,
        phone: client.phone,
      },
      professional: {
        id: professional.id,
        name: professional.name,
      },
      resourceIds,
      items,
      dateString,
      startAtMs: startMs,
      endAtMs: endMs,
      busyUntilMs: busyMs,
      modality,
      meetingUrl,
      pricing: {
        subtotal,
        discount,
        total,
        depositRequired,
        depositPaid: 0,
        paymentStatus: 'unpaid',
      },
      customDetails,
      status: depositRequired > 0 ? 'pending_deposit' : 'pending_approval',
    };

    // Grava na API Cloud compartilhada (sincroniza PC <-> iPhone)
    const cloudRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'appointment', data: newAppt }),
    }).catch(() => null);

    if (cloudRes && cloudRes.status === 409) {
      const errBody = await cloudRes.json();
      throw new Error(errBody.error || 'Horário já ocupado.');
    }

    const existing = getLocalAppointments();
    for (const appt of existing) {
      if (appt.dateString !== dateString) continue;
      if (!ACTIVE_STATUSES.includes(appt.status)) continue;
      const overlaps = appt.startAtMs < busyMs && appt.busyUntilMs > startMs;
      if (overlaps && appt.professional?.id === professional.id) {
        throw new Error('Este horário já está ocupado para esta profissional. Escolha outro horário.');
      }
    }

    existing.push(newAppt);
    saveLocalAppointments(existing);
    notifyLocalListeners('added', newAppt);
    return newAppt.id;
  }

  const startAt = Timestamp.fromDate(startDate);
  const endAt = Timestamp.fromDate(endDate);
  const busyUntil = Timestamp.fromDate(busyUntilDate);

  const appointmentsRef = collection(db, 'tenants', tenantId, 'appointments');
  const conflictQuery = query(appointmentsRef, where('dateString', '==', dateString));

  const blocksRef = collection(db, 'tenants', tenantId, 'schedule_blocks');
  const blocksQuery = query(blocksRef, where('startAt', '<', busyUntil));

  const [appointmentsSnap, blocksSnap] = await Promise.all([
    getDocs(conflictQuery),
    getDocs(blocksQuery),
  ]);

  for (const docSnap of appointmentsSnap.docs) {
    const appt = docSnap.data();
    if (!ACTIVE_STATUSES.includes(appt.status)) continue;

    const overlaps =
      appt.startAt.toMillis() < busyUntil.toMillis() &&
      appt.busyUntil.toMillis() > startAt.toMillis();

    if (overlaps) {
      if (appt.professional?.id === professional.id) {
        throw new Error('Este horário já está ocupado para esta profissional.');
      }
      const hasResourceConflict = resourceIds.some((rId) => appt.resourceIds?.includes(rId));
      if (hasResourceConflict) {
        throw new Error('A sala ou equipamento necessário já está ocupado neste horário.');
      }
    }
  }

  for (const docSnap of blocksSnap.docs) {
    const block = docSnap.data();
    const overlaps =
      block.startAt.toMillis() < busyUntil.toMillis() &&
      block.endAt.toMillis() > startAt.toMillis();

    if (overlaps) {
      const blocksWholeTenant = !block.professionalId && !block.resourceId;
      const blocksProf = block.professionalId === professional.id;
      const blocksResource = block.resourceId && resourceIds.includes(block.resourceId);

      if (blocksWholeTenant || blocksProf || blocksResource) {
        throw new Error(`Horário indisponível devido a bloqueio: ${block.reason || 'Agenda fechada'}.`);
      }
    }
  }

  const slotKeys = generateSlotKeys(startDate, busyUntilDate, slotIntervalMinutes);
  const newAppointmentRef = doc(appointmentsRef);

  await runTransaction(db, async (transaction) => {
    const lockRefs = [];

    for (const slotKey of slotKeys) {
      lockRefs.push(
        doc(db, 'tenants', tenantId, 'slot_locks', `prof_${professional.id}_${slotKey}`)
      );
      for (const rId of resourceIds) {
        lockRefs.push(
          doc(db, 'tenants', tenantId, 'slot_locks', `res_${rId}_${slotKey}`)
        );
      }
    }

    const lockSnaps = await Promise.all(lockRefs.map((ref) => transaction.get(ref)));

    for (const lockSnap of lockSnaps) {
      if (lockSnap.exists()) {
        throw new Error('Este horário acabou de ser reservado por outro cliente.');
      }
    }

    const appointmentData = {
      id: newAppointmentRef.id,
      client: {
        id: client.id || `cli_${Date.now()}`,
        name: client.name,
        phone: client.phone,
      },
      professional: {
        id: professional.id,
        name: professional.name,
      },
      resourceIds,
      items,
      dateString,
      startAt,
      endAt,
      busyUntil,
      modality,
      meetingUrl,
      slotLockIds: lockRefs.map((r) => r.id),
      pricing: {
        subtotal,
        discount,
        total,
        depositRequired,
        depositPaid: 0,
        paymentStatus: 'unpaid',
      },
      customDetails,
      status: depositRequired > 0 ? 'pending_deposit' : 'pending_approval',
      reminderSent24h: false,
      reminderSent2h: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    for (const lockRef of lockRefs) {
      transaction.set(lockRef, {
        appointmentId: newAppointmentRef.id,
        professionalId: professional.id,
        startAt,
        busyUntil,
        createdAt: serverTimestamp(),
      });
    }

    transaction.set(newAppointmentRef, appointmentData);
  });

  return newAppointmentRef.id;
}

export function subscribeToAppointments(tenantId = DEFAULT_TENANT_ID, filters = {}, onData, onError) {
  const { dateString, professionalId, startRange, endRange, statuses } = filters;

  if (!isFirebaseConfigured) {
    ensureCloudPolling();
    const emit = (changeType = 'modified', changedAppt = null) => {
      let list = getLocalAppointments().map((item) => ({
        ...item,
        startAt: hydrateTimestamp(item.startAtMs),
        endAt: hydrateTimestamp(item.endAtMs),
        busyUntil: hydrateTimestamp(item.busyUntilMs),
      }));

      if (dateString) {
        list = list.filter((a) => a.dateString === dateString);
      }
      if (professionalId) {
        list = list.filter((a) => a.professional?.id === professionalId);
      }
      if (Array.isArray(statuses) && statuses.length > 0) {
        list = list.filter((a) => statuses.includes(a.status));
      }

      list.sort((a, b) => a.startAtMs - b.startAtMs);

      const changes = changedAppt ? [{ type: changeType, appointment: changedAppt }] : [];
      onData(list, changes);
    };

    emit();
    localListeners.add(emit);
    return () => localListeners.delete(emit);
  }

  const appointmentsRef = collection(db, 'tenants', tenantId, 'appointments');
  const constraints = [];

  if (dateString) {
    constraints.push(where('dateString', '==', dateString));
  }

  if (professionalId) {
    constraints.push(where('professional.id', '==', professionalId));
  }

  if (startRange instanceof Date) {
    constraints.push(where('startAt', '>=', Timestamp.fromDate(startRange)));
  }

  if (endRange instanceof Date) {
    constraints.push(where('startAt', '<=', Timestamp.fromDate(endRange)));
  }

  if (Array.isArray(statuses) && statuses.length > 0) {
    constraints.push(where('status', 'in', statuses));
  }

  constraints.push(orderBy('startAt', 'asc'));

  const q = query(appointmentsRef, ...constraints);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const appointments = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const changes = snapshot.docChanges().map((change) => ({
        type: change.type,
        appointment: {
          id: change.doc.id,
          ...change.doc.data(),
        },
      }));

      onData(appointments, changes);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Erro no listener de agendamentos:', error);
      }
    }
  );

  return unsubscribe;
}

export async function updateAppointmentStatus(tenantId = DEFAULT_TENANT_ID, appointment, newStatus) {
  if (!isFirebaseConfigured) {
    const list = getLocalAppointments().map((item) =>
      item.id === appointment.id ? { ...item, status: newStatus } : item
    );
    saveLocalAppointments(list);
    notifyLocalListeners('modified', { ...appointment, status: newStatus });

    await fetch('/api/sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'appointment_status',
        id: appointment.id,
        status: newStatus,
      }),
    }).catch(() => {});

    return;
  }

  const appointmentRef = doc(db, 'tenants', tenantId, 'appointments', appointment.id);

  await updateDoc(appointmentRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  if (
    (newStatus === 'cancelled_by_tenant' || newStatus === 'cancelled_by_client') &&
    Array.isArray(appointment.slotLockIds)
  ) {
    await Promise.all(
      appointment.slotLockIds.map((lockId) =>
        deleteDoc(doc(db, 'tenants', tenantId, 'slot_locks', lockId)).catch(() => {})
      )
    );
  }
}
