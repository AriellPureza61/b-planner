import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  createAppointment,
  subscribeToAppointments,
  ACTIVE_STATUSES,
  DEFAULT_TENANT_ID,
  DEFAULT_PROFESSIONAL,
} from '../firebase/appointments';

const AVAILABLE_TIMES = [
  '09:00', '10:00', '11:00', '13:30', '14:30', '16:00', '17:30', '19:00'
];

export default function AgendamentoModal({ isOpen, onClose, services = [], initialServiceId = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    serviceId: '',
    date: '',
    time: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dayAppointments, setDayAppointments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        serviceId: initialServiceId || (services[0]?.id ?? ''),
        date: prev.date || new Date().toISOString().split('T')[0],
        time: '',
      }));
      setSubmitted(false);
      setErrorMsg('');
    }
  }, [isOpen, initialServiceId, services]);

  useEffect(() => {
    if (!isOpen || !formData.date) return;
    const unsubscribe = subscribeToAppointments(
      DEFAULT_TENANT_ID,
      { dateString: formData.date },
      (list) => setDayAppointments(list)
    );
    return () => unsubscribe();
  }, [isOpen, formData.date]);

  if (!isOpen) return null;

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  const selectedService = services.find((s) => String(s.id) === String(formData.serviceId));

  const parsePriceToCents = (priceFormatted = '') => {
    const numeric = Number(priceFormatted.replace(/[^\d,]/g, '').replace(',', '.'));
    return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
  };

  const parseDurationMinutes = (durationStr = '') => {
    const hoursMatch = durationStr.match(/(\d+)\s*h/i);
    const minsMatch = durationStr.match(/(\d+)\s*m/i);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    return hours * 60 + mins || 60;
  };

  const isSlotOccupied = (timeSlot) => {
    if (!formData.date) return false;
    const [year, month, day] = formData.date.split('-').map(Number);
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotStartMs = new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
    const durationMin = selectedService
      ? selectedService.durationMinutes ?? parseDurationMinutes(selectedService.duration)
      : 60;
    const slotBusyEndMs = slotStartMs + (durationMin + 15) * 60000;

    return dayAppointments.some((appt) => {
      if (!ACTIVE_STATUSES.includes(appt.status)) return false;
      const apptStart = appt.startAt?.toMillis ? appt.startAt.toMillis() : appt.startAtMs;
      const apptBusy = appt.busyUntil?.toMillis ? appt.busyUntil.toMillis() : appt.busyUntilMs;
      return apptStart < slotBusyEndMs && apptBusy > slotStartMs;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !formData.date || !formData.time) {
      setErrorMsg('Preencha todos os campos e escolha um horário.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hour, minute] = formData.time.split(':').map(Number);
      const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);

      await createAppointment(DEFAULT_TENANT_ID, {
        client: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        },
        professional: DEFAULT_PROFESSIONAL,
        items: [
          {
            serviceId: String(selectedService.id),
            serviceName: selectedService.name,
            price: selectedService.priceCents ?? parsePriceToCents(selectedService.priceFormatted),
            durationMinutes: selectedService.durationMinutes ?? parseDurationMinutes(selectedService.duration),
            bufferAfterMinutes: 15,
          },
        ],
        startDate,
        modality: 'in_person',
      });

      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err?.message || 'Erro ao salvar agendamento no Firestore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-rose-950/40 backdrop-blur-xs p-0 sm:p-4 transition-opacity">
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-rose-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-100 via-pink-50 to-rose-50 px-6 py-5 flex items-center justify-between border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-rose-200/70 text-rose-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Agendar Horário</h2>
              <p className="text-xs text-stone-500">Garanta seu momento de autocuidado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-rose-100/60 transition"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {submitted ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-stone-800">Solicitação Enviada!</h3>
              <p className="text-sm text-stone-600 max-w-sm mx-auto">
                Olá <span className="font-semibold text-stone-800">{formData.name}</span>, recebemos seu pré-agendamento para{' '}
                <span className="font-semibold text-rose-600">{selectedService?.name}</span> no dia{' '}
                <span className="font-semibold">{formData.date.split('-').reverse().join('/')}</span> às{' '}
                <span className="font-semibold">{formData.time}</span>.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md shadow-rose-200 transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Seu Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mariana Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/30 text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/30 text-stone-800 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Serviço Desejado */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Serviço Desejado
                </label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 bg-rose-50/30 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                >
                  <option value="" disabled>
                    Selecione um procedimento...
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {service.priceFormatted} ({service.duration})
                    </option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Data Preferida
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-rose-200 bg-rose-50/30 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Horário Disponível
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_TIMES.map((timeSlot) => {
                    const isSelected = formData.time === timeSlot;
                    const occupied = isSlotOccupied(timeSlot);
                    return (
                      <button
                        key={timeSlot}
                        type="button"
                        disabled={occupied}
                        onClick={() => setFormData({ ...formData, time: timeSlot })}
                        className={`py-2.5 px-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1 transition ${
                          occupied
                            ? 'bg-stone-100 text-stone-400 border-stone-200 line-through cursor-not-allowed'
                            : isSelected
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200 cursor-pointer'
                            : 'bg-white text-stone-700 border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 cursor-pointer'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {timeSlot}
                      </button>
                    );
                  })}
                </div>
                {!formData.time && (
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={() => {}}
                    className="sr-only"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Resumo do Serviço Selecionado */}
              {selectedService && (
                <div className="rounded-2xl bg-rose-50/70 border border-rose-100 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-500">Valor estimado</p>
                    <p className="text-base font-bold text-rose-700">{selectedService.priceFormatted}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-500">Duração média</p>
                    <p className="text-sm font-medium text-stone-700">{selectedService.duration}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-rose-200 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando no Firestore...
                    </>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
