import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Clock, ShieldCheck, Star, CalendarPlus, Heart, MapPin, AtSign, Smartphone } from 'lucide-react';
import AgendamentoModal from '../components/AgendamentoModal';
import { subscribeToServices, INITIAL_SERVICES, DEFAULT_TENANT_ID } from '../firebase/appointments';

const MOCK_SERVICES = [
  {
    id: '1',
    name: 'Alongamento em Fibra de Vidro',
    category: 'Alongamento',
    description: 'Unhas longas, resistentes e com curvatura natural impecável. Inclui cutilagem russa e esmaltação em gel.',
    priceFormatted: 'R$ 160,00',
    duration: '2h 00m',
    popular: true,
  },
  {
    id: '2',
    name: 'Manutenção de Fibra / Gel',
    category: 'Manutenção',
    description: 'Realinhamento da estrutura, reposição de produto, nivelamento de cutícula e troca de arte ou cor.',
    priceFormatted: 'R$ 110,00',
    duration: '1h 30m',
    popular: false,
  },
  {
    id: '3',
    name: 'Banho de Gel (Blindagem)',
    category: 'Proteção Natural',
    description: 'Camada protetora de gel sobre a unha natural para evitar quebras e garantir esmaltação intacta por 21 dias.',
    priceFormatted: 'R$ 95,00',
    duration: '1h 15m',
    popular: true,
  },
  {
    id: '4',
    name: 'Esmaltação em Gel + Manicure Russa',
    category: 'Estética & Brilho',
    description: 'Cutilagem a seco com brocas diamantadas e esmalte em gel com secagem imediata em cabine LED/UV.',
    priceFormatted: 'R$ 75,00',
    duration: '1h 00m',
    popular: false,
  },
  {
    id: '5',
    name: 'Spa dos Pés + Pedicure Gel',
    category: 'Relaxamento',
    description: 'Esfoliação botânica, hidratação profunda com parafina morna, massagem relaxante e esmaltação duradoura.',
    priceFormatted: 'R$ 85,00',
    duration: '1h 15m',
    popular: false,
  },
  {
    id: '6',
    name: 'Nail Art Encapsulada / Francesa Reversa',
    category: 'Arte Exclusiva',
    description: 'Design artístico personalizado com folhas de ouro, glitter fino, madrepérola ou francesa reversa estruturada.',
    priceFormatted: 'R$ 185,00',
    duration: '2h 30m',
    popular: true,
  },
];

export default function LandingPage() {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToServices(DEFAULT_TENANT_ID, (liveServices) => {
      if (Array.isArray(liveServices) && liveServices.length > 0) {
        setServices(liveServices);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleOpenBooking = (serviceId = '') => {
    setSelectedServiceId(serviceId);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFBFB] text-stone-800 font-sans selection:bg-rose-200 selection:text-rose-900">
      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-stone-800">
              B. <span className="text-rose-500">Planner</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#servicos" className="hover:text-rose-600 transition">Nossos Serviços</a>
            <a href="#diferenciais" className="hover:text-rose-600 transition">Biossegurança</a>
            <a href="#localizacao" className="hover:text-rose-600 transition">Localização</a>
            <Link to="/admin" className="text-rose-600 hover:text-rose-700 font-semibold transition">
              Painel Admin
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="md:hidden px-3 py-2 rounded-full border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              App Admin
            </Link>
            <button
              onClick={() => handleOpenBooking()}
              className="px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium shadow-sm shadow-rose-200 transition cursor-pointer"
            >
              Agendar Horário
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/80 via-pink-50/30 to-[#FFFBFB] pt-12 pb-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/80 text-rose-700 text-xs font-semibold tracking-wide">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              Especialistas em Alongamento & Naturalidade
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-stone-900 leading-tight">
              Unhas impecáveis que refletem a sua{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600">
                delicadeza
              </span>
              .
            </h1>

            <p className="text-stone-600 text-base sm:text-lg leading-relaxed max-w-xl">
              Acabamento fino, alta durabilidade e atendimento exclusivo com hora marcada. Escolha seu procedimento e reserve em menos de 1 minuto.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <button
                onClick={() => handleOpenBooking()}
                className="px-7 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-base shadow-lg shadow-rose-200/80 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CalendarPlus className="w-5 h-5" />
                Agendar Agora
              </button>
              <a
                href="#servicos"
                className="px-7 py-4 rounded-2xl bg-white hover:bg-rose-50 text-stone-700 font-medium text-base border border-rose-200 flex items-center justify-center transition"
              >
                Ver Tabela de Preços
              </a>
            </div>

            {/* Social Proof */}
            <div className="pt-4 flex items-center gap-6 border-t border-rose-100/80">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-4 h-4 fill-amber-400" />
                ))}
                <span className="ml-1.5 text-sm font-bold text-stone-800">4.9/5</span>
              </div>
              <p className="text-xs text-stone-500">
                Mais de <strong className="text-stone-700">1.200+ clientes</strong> atendidas com satisfação máxima
              </p>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="relative">
            <div className="aspect-4/5 max-w-md mx-auto rounded-3xl bg-gradient-to-tr from-rose-200 via-pink-100 to-amber-50 p-3 shadow-xl border border-white">
              <div className="w-full h-full rounded-2xl bg-white/70 backdrop-blur-xs flex flex-col justify-between p-6 border border-rose-100">
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-medium">
                    Agenda Aberta
                  </span>
                  <span className="text-xs font-medium text-stone-500">Biossegurança 100% Autoclave</span>
                </div>

                <div className="my-auto text-center space-y-3 py-8">
                  <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-stone-800">Experiência VIP</h3>
                  <p className="text-sm text-stone-600 max-w-xs mx-auto">
                    Ambiente climatizado, café gourmet e materiais hipoalergênicos importados.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-xs border border-rose-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-400">Próximo horário livre hoje</p>
                    <p className="text-sm font-bold text-stone-800">14:30 • Fibra ou Gel</p>
                  </div>
                  <button
                    onClick={() => handleOpenBooking('1')}
                    className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Reservar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section id="diferenciais" className="py-12 border-y border-rose-100 bg-rose-50/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-4">
            <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-800 text-sm">Esterilização Hospitalar</h3>
              <p className="text-xs text-stone-500 mt-1">
                Todos os instrumentais são esterilizados em autoclave com kits individuais descartáveis.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4">
            <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-800 text-sm">Pontualidade Britânica</h3>
              <p className="text-xs text-stone-500 mt-1">
                Respeitamos sua rotina. Atendimento sem filas de espera com agendamento inteligente.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4">
            <div className="p-3 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-800 text-sm">Durabilidade Garantida</h3>
              <p className="text-xs text-stone-500 mt-1">
                Produtos certificados pela ANVISA que preservam a saúde da sua unha natural.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Nossos Serviços */}
      <section id="servicos" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-rose-500">
            Menu de Procedimentos
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900">
            Nossos Serviços
          </h2>
          <p className="text-sm sm:text-base text-stone-500">
            Escolha o procedimento ideal para o seu estilo e agende diretamente no horário de sua preferência.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative rounded-3xl bg-white border border-rose-100 hover:border-rose-300 p-6 shadow-xs hover:shadow-xl hover:shadow-rose-100/60 transition flex flex-col justify-between"
            >
              {service.popular && (
                <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-semibold shadow-xs">
                  Mais Pedido
                </span>
              )}

              <div className="space-y-3">
                <span className="inline-block text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                  {service.category}
                </span>
                <h3 className="text-lg font-bold text-stone-800 group-hover:text-rose-600 transition">
                  {service.name}
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-rose-50 flex items-center justify-between">
                <div>
                  <span className="block text-lg font-bold text-stone-900">{service.priceFormatted}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                    <Clock className="w-3.5 h-3.5" /> {service.duration}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenBooking(service.id)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Agendar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="localizacao" className="bg-rose-950 text-rose-100/80 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-serif text-lg font-semibold">
              <Sparkles className="w-5 h-5 text-rose-400" />
              B. Planner • Nail & Beauty Studio
            </div>
            <p className="text-xs text-rose-200/70 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              Av. Paulista, 1000 - Sala 42 • Jardins, São Paulo - SP
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-rose-200">
              <AtSign className="w-4 h-4 text-rose-400" /> @b.planner.studio
            </span>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante "Agendar Agora" */}
      <button
        onClick={() => handleOpenBooking()}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-5 py-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
        aria-label="Agendar Agora"
      >
        <CalendarPlus className="w-5 h-5" />
        <span>Agendar Agora</span>
      </button>

      {/* Modal de Agendamento */}
      <AgendamentoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        services={services}
        initialServiceId={selectedServiceId}
      />
    </div>
  );
}
