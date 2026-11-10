import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Check,
  X,
  Phone,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bell,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  Plus,
  Trash2,
  MessageCircle,
  Wallet,
  Scissors,
  CalendarDays,
} from 'lucide-react';
import {
  subscribeToAppointments,
  updateAppointmentStatus,
  subscribeToServices,
  createService,
  deleteService,
  INITIAL_SERVICES,
  DEFAULT_TENANT_ID,
} from '../firebase/appointments';
import AgendamentoModal from '../components/AgendamentoModal';

const STATUS_BADGE = {
  pending_approval: {
    label: 'Pendente',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  pending_deposit: {
    label: 'Aguard. Sinal',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  confirmed: {
    label: 'Confirmado',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  completed: {
    label: 'Concluído',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  cancelled_by_tenant: {
    label: 'Cancelado',
    classes: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  cancelled_by_client: {
    label: 'Cancelado',
    classes: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'servicos' | 'financeiro'
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  // Novo serviço state
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    category: 'Alongamento',
    description: '',
    priceReais: '',
    durationMinutes: '90',
    popular: false,
  });
  const [savingService, setSavingService] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    const unsubServices = subscribeToServices(DEFAULT_TENANT_ID, (list) => {
      if (Array.isArray(list) && list.length > 0) {
        setServices(list);
      }
    });
    return () => unsubServices();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    const unsubscribe = subscribeToAppointments(
      DEFAULT_TENANT_ID,
      { dateString: selectedDate },
      (data, changes) => {
        setAppointments(data);
        setLoading(false);

        if (changes.some((c) => c.type === 'added' || c.type === 'modified')) {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);
        }
      },
      (err) => {
        setError(err?.message || 'Erro ao escutar agendamentos em tempo real.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate]);

  const handleShiftDay = (offsetDays) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d + offsetDays);
    const nextDate = [
      dt.getFullYear(),
      String(dt.getMonth() + 1).padStart(2, '0'),
      String(dt.getDate()).padStart(2, '0'),
    ].join('-');
    setSelectedDate(nextDate);
  };

  const handleStatusChange = async (appointment, newStatus) => {
    setUpdatingId(appointment.id);
    try {
      await updateAppointmentStatus(DEFAULT_TENANT_ID, appointment, newStatus);
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar o status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceForm.name || !newServiceForm.priceReais) return;
    setSavingService(true);
    try {
      await createService(DEFAULT_TENANT_ID, newServiceForm);
      setNewServiceForm({
        name: '',
        category: 'Alongamento',
        description: '',
        priceReais: '',
        durationMinutes: '90',
        popular: false,
      });
    } catch (err) {
      setError(err?.message || 'Erro ao criar serviço.');
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      await deleteService(DEFAULT_TENANT_ID, serviceId);
    } catch (err) {
      setError(err?.message || 'Erro ao remover serviço.');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '--:--';
    const dt = timestamp.toDate();
    return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (cents = 0) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openWhatsApp = (appt) => {
    const digits = (appt.client?.phone || '').replace(/\D/g, '');
    const phoneWithCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const serviceNames = appt.items?.map((i) => i.serviceName).join(' + ') || 'procedimento';
    const msg = encodeURIComponent(
      `Olá ${appt.client?.name}! Aqui é do B. Planner Studio. Seu agendamento de ${serviceNames} no dia ${appt.dateString
        .split('-')
        .reverse()
        .join('/')} às ${formatTime(appt.startAt)} está confirmado!`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${msg}`, '_blank');
  };

  const confirmedAppointments = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'completed'
  );
  const pendingAppointments = appointments.filter(
    (a) => a.status === 'pending_approval' || a.status === 'pending_deposit'
  );
  const confirmedRevenueCents = confirmedAppointments.reduce(
    (acc, a) => acc + (a.pricing?.total || 0),
    0
  );
  const expectedRevenueCents = appointments
    .filter((a) => a.status !== 'cancelled_by_tenant' && a.status !== 'cancelled_by_client')
    .reduce((acc, a) => acc + (a.pricing?.total || 0), 0);

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center sm:py-6 sm:px-4 font-sans">
      {/* Container Mobile-First simulando tela de Aplicativo Instalável */}
      <div className="w-full max-w-md bg-[#FFFBFB] sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[6px] sm:border-stone-900 overflow-hidden flex flex-col min-h-screen sm:min-h-[820px] sm:max-h-[880px] relative">
        {/* Top App Bar */}
        <header className="bg-gradient-to-br from-rose-500 to-pink-600 text-white px-5 pt-6 pb-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-full hover:bg-white/15 transition flex items-center gap-1.5 text-xs font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver Site
            </Link>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-transform duration-300 ${
                  realtimePulse ? 'bg-emerald-300 scale-150' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[11px] font-medium text-rose-100">
                Sincronizado em Tempo Real
              </span>
            </div>

            <div className="flex items-center gap-2">
              {installPrompt && (
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="px-2.5 py-1.5 rounded-full bg-white text-rose-600 text-[11px] font-bold flex items-center gap-1 shadow-xs hover:bg-rose-50 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNewBookingOpen(true)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition cursor-pointer"
                title="Novo Agendamento Manual"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-rose-100 font-medium">B. Planner • App Admin</p>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-5 h-5" />
                {activeTab === 'agenda' && 'Agenda do Dia'}
                {activeTab === 'servicos' && 'Catálogo de Serviços'}
                {activeTab === 'financeiro' && 'Resumo Financeiro'}
              </h1>
            </div>
          </div>

          {/* Seletor de Data Mobile */}
          {activeTab !== 'servicos' && (
            <div className="mt-3.5 bg-white/15 backdrop-blur-xs rounded-2xl p-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleShiftDay(-1)}
                className="p-2 rounded-xl hover:bg-white/20 transition cursor-pointer"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-200" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDay(1)}
                className="p-2 rounded-xl hover:bg-white/20 transition cursor-pointer"
                aria-label="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* ABA 1: AGENDA DO DIA */}
        {activeTab === 'agenda' && (
          <>
            <div className="grid grid-cols-3 gap-2.5 px-4 py-3 bg-rose-50/60 border-b border-rose-100">
              <div className="bg-white rounded-2xl p-2.5 text-center border border-rose-100 shadow-2xs">
                <span className="block text-[11px] text-stone-400 font-medium">Total</span>
                <span className="text-base font-bold text-stone-800">{appointments.length}</span>
              </div>
              <div className="bg-white rounded-2xl p-2.5 text-center border border-amber-100 shadow-2xs">
                <span className="block text-[11px] text-amber-600 font-medium">Pendentes</span>
                <span className="text-base font-bold text-amber-700">
                  {pendingAppointments.length}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-2.5 text-center border border-emerald-100 shadow-2xs">
                <span className="block text-[11px] text-emerald-600 font-medium">Confirmados</span>
                <span className="text-base font-bold text-emerald-700">
                  {confirmedAppointments.length}
                </span>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
              {error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-2">
                  <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
                  <p className="text-xs font-medium">Sincronizando agenda em tempo real...</p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-14 text-center space-y-3 px-6">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-700">
                    Nenhum agendamento para este dia
                  </h3>
                  <p className="text-xs text-stone-400">
                    Novos agendamentos feitos no site aparecem aqui instantaneamente sem recarregar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewBookingOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Encaixar Cliente
                  </button>
                </div>
              ) : (
                appointments.map((appt) => {
                  const badge = STATUS_BADGE[appt.status] || {
                    label: appt.status,
                    classes: 'bg-stone-100 text-stone-700 border-stone-200',
                  };
                  const isCancelled =
                    appt.status === 'cancelled_by_tenant' || appt.status === 'cancelled_by_client';
                  const isConfirmed = appt.status === 'confirmed';
                  const isUpdating = updatingId === appt.id;
                  const serviceNames =
                    appt.items?.map((i) => i.serviceName).join(' + ') || 'Procedimento';

                  return (
                    <div
                      key={appt.id}
                      className={`rounded-2xl bg-white border p-4 shadow-xs transition ${
                        isCancelled
                          ? 'border-stone-200 opacity-60'
                          : 'border-rose-100 hover:border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5 text-rose-600 font-bold text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(appt.startAt)}</span>
                          <span className="text-stone-300 font-normal">•</span>
                          <span className="text-xs font-medium text-stone-500">
                            até {formatTime(appt.endAt)}
                          </span>
                        </div>

                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-stone-800">{appt.client?.name}</h3>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(appt)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                        </div>
                        <p className="text-xs font-medium text-rose-600">{serviceNames}</p>
                        <div className="flex items-center justify-between pt-1 text-xs text-stone-500">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            {appt.client?.phone}
                          </span>
                          <span className="font-semibold text-stone-800">
                            {formatCurrency(appt.pricing?.total)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-rose-50 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isUpdating || isConfirmed || isCancelled}
                          onClick={() => handleStatusChange(appt, 'confirmed')}
                          className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-100 disabled:text-stone-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirmar
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating || isCancelled}
                          onClick={() => handleStatusChange(appt, 'cancelled_by_tenant')}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:bg-stone-100 disabled:text-stone-400 text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </main>
          </>
        )}

        {/* ABA 2: CATÁLOGO DE SERVIÇOS */}
        {activeTab === 'servicos' && (
          <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            <form
              onSubmit={handleCreateService}
              className="rounded-2xl bg-white border border-rose-100 p-4 shadow-xs space-y-3"
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Adicionar Novo Procedimento
              </h2>
              <input
                type="text"
                required
                placeholder="Nome do serviço (ex: Alongamento Gel)"
                value={newServiceForm.name}
                onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Preço R$ (ex: 140)"
                  value={newServiceForm.priceReais}
                  onChange={(e) =>
                    setNewServiceForm({ ...newServiceForm, priceReais: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <select
                  value={newServiceForm.durationMinutes}
                  onChange={(e) =>
                    setNewServiceForm({ ...newServiceForm, durationMinutes: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="45">45 min</option>
                  <option value="60">1h 00m</option>
                  <option value="75">1h 15m</option>
                  <option value="90">1h 30m</option>
                  <option value="120">2h 00m</option>
                  <option value="150">2h 30m</option>
                </select>
              </div>
              <textarea
                rows={2}
                placeholder="Descrição curta do procedimento..."
                value={newServiceForm.description}
                onChange={(e) =>
                  setNewServiceForm({ ...newServiceForm, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="submit"
                disabled={savingService}
                className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition cursor-pointer"
              >
                {savingService ? 'Salvando...' : '+ Cadastrar Serviço no Site'}
              </button>
            </form>

            <div className="space-y-2.5">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="rounded-2xl bg-white border border-rose-100 p-3.5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {srv.category}
                    </span>
                    <h3 className="text-xs font-bold text-stone-800 mt-1">{srv.name}</h3>
                    <p className="text-xs font-semibold text-stone-600 mt-0.5">
                      {srv.priceFormatted} • {srv.duration}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(srv.id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remover serviço"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ABA 3: FINANCEIRO DO DIA */}
        {activeTab === 'financeiro' && (
          <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 shadow-md space-y-1">
              <span className="text-xs font-medium text-emerald-100">
                Receita Confirmada no Dia
              </span>
              <p className="text-2xl font-bold">{formatCurrency(confirmedRevenueCents)}</p>
              <p className="text-[11px] text-emerald-100 pt-1">
                Previsão total (com pendentes): {formatCurrency(expectedRevenueCents)}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-rose-100 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Detalhamento por Cliente ({selectedDate.split('-').reverse().join('/')})
              </h3>
              {appointments.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">
                  Sem movimentações nesta data.
                </p>
              ) : (
                appointments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2 border-b border-rose-50 last:border-0 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-stone-800">{a.client?.name}</p>
                      <p className="text-[11px] text-stone-400">
                        {formatTime(a.startAt)} • {STATUS_BADGE[a.status]?.label || a.status}
                      </p>
                    </div>
                    <span
                      className={`font-bold ${
                        a.status === 'cancelled_by_tenant'
                          ? 'line-through text-stone-400'
                          : 'text-stone-800'
                      }`}
                    >
                      {formatCurrency(a.pricing?.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </main>
        )}

        {/* Bottom Navigation Bar (App Nativo) */}
        <nav className="sticky bottom-0 inset-x-0 bg-white border-t border-rose-100 px-6 py-2.5 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'agenda' ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            Agenda
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('servicos')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'servicos' ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Scissors className="w-5 h-5" />
            Serviços
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'financeiro' ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <Wallet className="w-5 h-5" />
            Caixa
          </button>
        </nav>

        <AgendamentoModal
          isOpen={isNewBookingOpen}
          onClose={() => setIsNewBookingOpen(false)}
          services={services}
        />
      </div>
    </div>
  );
}
