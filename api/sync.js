const INITIAL_SERVICES = [
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

const ACTIVE_STATUSES = [
  'pending_deposit',
  'pending_approval',
  'confirmed',
  'checked_in',
  'in_progress',
];

async function readCloudStore(token, gistId) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Falha ao ler banco na nuvem (${res.status})`);
  }
  const gist = await res.json();
  const raw = gist.files?.['lumiere_db.json']?.content;
  const parsed = raw ? JSON.parse(raw) : {};
  return {
    appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    services:
      Array.isArray(parsed.services) && parsed.services.length > 0
        ? parsed.services
        : INITIAL_SERVICES,
  };
}

async function writeCloudStore(token, gistId, data) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        'lumiere_db.json': {
          content: JSON.stringify(data),
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao gravar banco na nuvem (${res.status})`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.CLOUD_GH_TOKEN;
  const gistId = process.env.CLOUD_GIST_ID;

  if (!token || !gistId) {
    return res.status(503).json({ error: 'Cloud store not configured' });
  }

  try {
    const dbState = await readCloudStore(token, gistId);

    if (req.method === 'GET') {
      return res.status(200).json(dbState);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

    if (req.method === 'POST' && body.entity === 'appointment') {
      const appt = body.data;
      for (const existing of dbState.appointments) {
        if (existing.dateString !== appt.dateString) continue;
        if (!ACTIVE_STATUSES.includes(existing.status)) continue;
        const overlaps =
          existing.startAtMs < appt.busyUntilMs && existing.busyUntilMs > appt.startAtMs;
        if (overlaps && existing.professional?.id === appt.professional?.id) {
          return res.status(409).json({
            error: 'Este horário já está ocupado para esta profissional. Escolha outro horário.',
          });
        }
      }
      dbState.appointments.push(appt);
      await writeCloudStore(token, gistId, dbState);
      return res.status(201).json({ appointment: appt });
    }

    if (req.method === 'PATCH' && body.entity === 'appointment_status') {
      const { id, status } = body;
      dbState.appointments = dbState.appointments.map((a) =>
        a.id === id ? { ...a, status, updatedAtMs: Date.now() } : a
      );
      await writeCloudStore(token, gistId, dbState);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && body.entity === 'service') {
      dbState.services.push(body.data);
      await writeCloudStore(token, gistId, dbState);
      return res.status(201).json({ service: body.data });
    }

    if (req.method === 'DELETE' && body.entity === 'service') {
      dbState.services = dbState.services.filter((s) => s.id !== body.id);
      await writeCloudStore(token, gistId, dbState);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Operação inválida' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
