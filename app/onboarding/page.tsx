"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";



type OnboardingData = {
  fullName: string;
  university: string;
  specialty: string;
  defenseDate: string; // ISO date string (yyyy-mm-dd)
};

const TUNISIAN_UNIS = [
  "Avicenne Private Business School [Privée]",
  "Dauphine Tunis [Privée]",
  "ENICarthage (École Nationale d'Ingénieurs de Carthage)",
  "ENIG (École Nationale d'Ingénieurs de Gabès)",
  "ENIM (École Nationale d'Ingénieurs de Monastir)",
  "ENIB (École Nationale d'Ingénieurs de Bizerte)",
  "ENIS (École Nationale d'Ingénieurs de Sfax)",
  "ENISO (École Nationale d'Ingénieurs de Sousse)",
  "ENIT (École Nationale d'Ingénieurs de Tunis)",
  "ENSI (École Nationale des Sciences de l'Informatique)",
  "ENSIT (École Nationale Supérieure d'Ingénieurs de Tunis)",
  "EPI (École Pluridisciplinaire Internationale) [Privée]",
  "ESA Kef (École Supérieure d'Agriculture)",
  "ESAM (École Supérieure d'Agriculture de Mograne)",
  "ESC (École Supérieure de Commerce de Tunis)",
  "ESEN (École Supérieure d'Économie Numérique)",
  "ESIER (École Supérieure des Ingénieurs de l'Équipement Rural)",
  "ESIM (École Supérieure des Ingénieurs de Medjez El Bab)",
  "ESPIN (École Supérieure Polytechnique Internationale) [Privée]",
  "ESPRIT (École Supérieure Privée d'Ingénierie et de Technologies) [Privée]",
  "ESSEC (École Supérieure des Sciences Économiques et Commerciales)",
  "ESST Sousse (École Supérieure des Sciences et de Technologie) [Privée]",
  "ESSTHS (École Supérieure des Sciences et de la Technologie de Hammam Sousse)",
  "FMT (Faculté de Médecine de Tunis)",
  "FMS (Faculté de Médecine de Sfax)",
  "FMDM (Faculté de Médecine Dentaire de Monastir)",
  "FMPM (Faculté de Pharmacie de Monastir)",
  "FMS (Faculté de Médecine de Sousse)",
  "FS Gafsa (Faculté des Sciences)",
  "FSB (Faculté des Sciences de Bizerte)",
  "FSEG Mahdia (Faculté des Sciences Économiques et de Gestion)",
  "FSEG Nabeul (Faculté des Sciences Économiques et de Gestion)",
  "FSEG Sousse (Faculté des Sciences Économiques et de Gestion)",
  "FSEGS (Faculté des Sciences Économiques et de Gestion de Sfax)",
  "FSG (Faculté des Sciences de Gabès)",
  "FSJEG Jendouba (Faculté des Sciences Juridiques, Économiques et de Gestion)",
  "FSM (Faculté des Sciences de Monastir)",
  "FST (Faculté des Sciences de Tunis)",
  "Ibn Khaldoun University [Privée]",
  "IHEC Carthage (Institut des Hautes Études Commerciales)",
  "IHEC Sfax",
  "IHEC Sousse",
  "IIT (Institut International de Technologie) [Privée]",
  "ITBS (Information Technology Business School)",
  "INSAT (Institut National des Sciences Appliquées et de Technologie)",
  "IPEIB (Institut Préparatoire aux Études d'Ingénieurs de Bizerte)",
  "IPEIM (Institut Préparatoire aux Études d'Ingénieurs de Monastir)",
  "IPEIN (Institut Préparatoire aux Études d'Ingénieurs de Nabeul)",
  "IPSAS (Institut Polytechnique Privé) [Privée]",
  "ISA (Institut Supérieur des Arts du Multimédia)",
  "ISAAS (Institut Supérieur d'Administration des Affaires de Sfax)",
  "ISAE Gafsa (Institut Supérieur d'Administration des Entreprises)",
  "ISAMG (Institut Supérieur des Arts et Métiers de Gabès)",
  "ISAMm (Institut Supérieur des Arts Multimédia de la Manouba)",
  "ISBA (Institut Supérieur des Beaux-Arts de Nabeul)",
  "ISBAM (Institut Supérieur de Biologie Appliquée de Médenine)",
  "ISCAE (Institut Supérieur de Comptabilité et d'Administration des Entreprises)",
  "ISET Beja",
  "ISET Bizerte",
  "ISET Charguia (Tunis)",
  "ISET Com (Cité Technologique)",
  "ISET Djerba",
  "ISET Gabès",
  "ISET Gafsa",
  "ISET Jendouba",
  "ISET Kairouan",
  "ISET Kasserine",
  "ISET Kebili",
  "ISET Kef",
  "ISET Kelibia",
  "ISET Mahdia",
  "ISET Medenine",
  "ISET Nabeul",
  "ISET Rades",
  "ISET Sfax",
  "ISET Sidi Bouzid",
  "ISET Siliana",
  "ISET Sousse",
  "ISET Tataouine",
  "ISET Tozeur",
  "ISET Zaghouan",
  "ISET Zahra",
  "ISG (Institut Supérieur de Gestion de Tunis)",
  "ISG Bizerte",
  "ISG Gabès",
  "ISG Sousse",
  "ISI (Institut Supérieur d'Informatique)",
  "ISIG Kairouan",
  "ISIG Kef",
  "ISIM (Institut Supérieur d'Informatique de Mahdia)",
  "ISIMM (Institut Supérieur d'Informatique et de Mathématiques de Monastir)",
  "ISIMS (Institut Supérieur d'Informatique et de Multimédia de Sfax)",
  "ISITCom (Institut Supérieur d'Informatique et de Communication de Hammam Sousse)",
  "ISLAIB (Institut Supérieur des Langues Appliquées de Béja)",
  "ISSAT Gafsa",
  "ISSAT Kairouan",
  "ISSAT Mateur",
  "ISSAT Sousse",
  "ISSTE (Institut Supérieur des Sciences et Technologies de l'Environnement - Borj Cedria)",
  "ISTEUB (Institut Supérieur des Technologies de l'Environnement)",
  "Law & Business School (LBS) [Privée]",
  "MedTech (Mediterranean Institute of Technology) [Privée]",
  "MSB (Mediterranean School of Business) [Privée]",
  "Polytech Intl [Privée]",
  "Polytech Monastir [Privée]",
  "Polytechnique Sousse [Privée]",
  "Sesame University [Privée]",
  "SUPTECH (École Supérieure de Technologie et de Management) [Privée]",
  "TBS (Tunis Business School)",
  "Tek-Up University [Privée]",
  "Time Université [Privée]",
  "UIT (Université Internationale de Tunis) [Privée]",
  "ULS (Université Privée du Sud - Sfax) [Privée]",
  "ULT (Université Libre de Tunis) [Privée]",
  "Université Centrale [Privée]",
  "Université de la Manouba",
  "Université Mahmoud el Materi [Privée]",
  "UPS (Université Privée de Sousse) [Privée]",
  "UTC (Université Tunis Carthage) [Privée]",
  "Autre"
];

const COMMON_SPECIALTIES = [
  // IT & Engineering
  "Génie Logiciel",
  "Systèmes Embarqués & IoT",
  "Data Science & IA",
  "Business Intelligence (BI)",
  "Cybersécurité",
  "Réseaux et Télécommunications",
  "Cloud Computing",
  "Développement Web & Mobile",
  "Génie Mécatronique",
  "Génie Industriel",
  "Génie Mécanique",
  "Génie Électrique",
  "Génie Civil",
  "Génie Énergétique",
  "Génie Chimique",
  "Génie Biologique",

  // Business & Management
  "Marketing Digital",
  "Finance & Actuariat",
  "Comptabilité & Audit",
  "Management des Affaires",
  "Ressources Humaines",
  "Logistique & Supply Chain",
  "Commerce International",

  // Health
  "Médecine",
  "Médecine Dentaire",
  "Pharmacie",
  "Sciences Infirmières",
  "Nutrition & Diététique",
  "Kinésithérapie",
  "Anesthésie & Réanimation",

  // Others
  "Architecture",
  "Design Graphique",
  "Droit Privé",
  "Droit Public",
  "Journalisme & Communication",
  "Langues & Traduction",
  "Autre",
];

const STEP_COUNT = 4;

const stepVariants: Variants = {
  enter: {
    x: 40,
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    x: -40,
    opacity: 0,
    transition: { duration: 0.25, ease: "easeIn" },
  },
};

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingData>({
    fullName: "",
    university: "",
    specialty: "",
    defenseDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uniQuery, setUniQuery] = useState("");
  const [specialtyQuery, setSpecialtyQuery] = useState("");

  const progress = useMemo(
    () => ((step) / STEP_COUNT) * 100,
    [step]
  );

  const filteredUnis = useMemo(() => {
    if (!uniQuery.trim()) return TUNISIAN_UNIS;
    return TUNISIAN_UNIS.filter((u) =>
      u.toLowerCase().includes(uniQuery.toLowerCase())
    );
  }, [uniQuery]);

  const filteredSpecialties = useMemo(() => {
    if (!specialtyQuery.trim()) return COMMON_SPECIALTIES;
    return COMMON_SPECIALTIES.filter((s) =>
      s.toLowerCase().includes(specialtyQuery.toLowerCase())
    );
  }, [specialtyQuery]);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const isStepValid = () => {
    switch (step) {
      case 0:
        return form.fullName.trim().length > 1;
      case 1:
        return form.university.trim().length > 0;
      case 2:
        return form.specialty.trim().length > 0;
      case 3:
        return !!form.defenseDate;
      default:
        return false;
    }
  };

  const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleNext = async () => {
    if (!isStepValid()) return;

    if (step < STEP_COUNT - 1) {
      setStep((prev) => prev + 1);
    } else {
      // Final submission - Save to Supabase
      setIsSubmitting(true);
      
      try {
        const supabase = createClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Not authenticated');
        }
        
        // Use user's Google avatar if available
        const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        
        // Update profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: form.fullName,
            avatar_url: avatarUrl,
            university: form.university,
            specialty: form.specialty,
            defense_date: form.defenseDate || null,
          })
          .eq('id', user.id);
        
        if (error) throw error;
        
        // Verify the write landed — prevents middleware from seeing stale data
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('university')
          .eq('id', user.id)
          .single();
        
        if (!verifyProfile?.university) {
          throw new Error('Profile update did not persist');
        }
        
        // Brief pause for the workspace animation, then hard redirect.
        // Using replace() so the user can't back-button into onboarding.
        await new Promise((r) => setTimeout(r, 800));
        window.location.replace('/dashboard');
      } catch (error) {
        console.error('Error saving profile:', error);
        setIsSubmitting(false);
        alert('Failed to save profile. Please try again.');
      }
    }
  };

  const handleBack = () => {
    if (step === 0 || isSubmitting) return;
    setStep((prev) => prev - 1);
  };

  const currentUniForCaption = form.university || "your university";

  if (isSubmitting) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col">
        {/* Progress bar at 100% */}
        <div className="h-[2px] bg-black w-full" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full space-y-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Setting things up
              </p>
              <h1 className="text-2xl font-bold tracking-tighter">
                Generating your workspace...
              </h1>
            </div>

            <div className="flex items-center gap-8">
              {/* Minimal monochrome Tunisia map with pulsing dot */}
              <div className="relative w-32 h-40 border-[4px] border-black bg-white overflow-hidden">
                <div className="absolute inset-3 border border-neutral-300" />
                {/* Stylised Tunisia silhouette */}
                <div className="absolute left-1/2 top-2 h-32 w-10 -translate-x-1/2 border-[2px] border-black rounded-[40%]" />

                {/* Pulsing dot near center */}
                <motion.div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-black"
                  animate={{ scale: [1, 1.7, 1] , opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <div className="text-sm text-neutral-700 leading-relaxed">
                <p className="mb-2">
                  We&apos;re wiring your simulated jury, deadlines, and workspace.
                </p>
                <p className="text-neutral-500">
                  This should only take a second.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col">
      {/* Thin progress bar */}
      <div className="h-[2px] w-full bg-neutral-200">
        <div
          className="h-full bg-black transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl mb-12">
            <div className="flex justify-center mb-8">
                <Image src="/images/logo.png" alt="Latexo" width={120} height={40} className="object-contain" priority />
            </div>
          <div className="flex items-center justify-between mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
              Step {step + 1} of {STEP_COUNT}
            </p>

            {/* LayoutId for subtle Next button morphing */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  rounded="default"
                  type="button"
                  onClick={handleBack}
                  className="text-neutral-500 hover:bg-neutral-100 px-3 py-1 h-9"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
          </div>

          <div className="relative min-h-[220px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6"
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">
                        What should we call you?
                      </h1>
                      <p className="text-sm text-neutral-500">
                        This will appear on your simulated jury reports.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                        Full name
                      </label>
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            fullName: toTitleCase(e.target.value),
                          }))
                        }
                        className="w-full bg-transparent border-0 border-b border-neutral-200 focus:border-b-[2px] focus:border-black focus:outline-none focus:ring-0 px-0 py-2 text-sm"
                        placeholder="Write your name the way the jury should see it"
                      />
                    </div>
                  </div>
                )}


                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">
                        Where are you studying?
                      </h1>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                          University
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={form.university}
                            onChange={(e) => {
                              const value = toTitleCase(e.target.value);
                              setForm((prev) => ({ ...prev, university: value }));
                              setUniQuery(value);
                            }}
                            className="w-full bg-transparent border-0 border-b border-neutral-200 focus:border-b-[2px] focus:border-black focus:outline-none focus:ring-0 px-0 py-2 text-sm"
                            placeholder="Type to search (INSAT, ESPRIT, ENIT, ISG, ...)"
                          />

                          {filteredUnis.length > 0 && (
                            <div className="absolute left-0 right-0 mt-2 border border-neutral-200 bg-white shadow-sm max-h-40 overflow-y-auto z-10">
                              {filteredUnis.map((uni) => (
                                <button
                                  key={uni}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, university: uni }));
                                    setUniQuery(uni);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100"
                                >
                                  {uni}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">
                        What&apos;s your specialty?
                      </h1>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                          Specialty / Major
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={form.specialty}
                            onChange={(e) => {
                              const value = toTitleCase(e.target.value);
                              setForm((prev) => ({ ...prev, specialty: value }));
                              setSpecialtyQuery(value);
                            }}
                            className="w-full bg-transparent border-0 border-b border-neutral-200 focus:border-b-[2px] focus:border-black focus:outline-none focus:ring-0 px-0 py-2 text-sm"
                            placeholder="Type to search your major"
                          />

                          {filteredSpecialties.length > 0 && (
                            <div className="absolute left-0 right-0 mt-2 border border-neutral-200 bg-white shadow-sm max-h-40 overflow-y-auto z-10">
                              {filteredSpecialties.map((spec) => (
                                <button
                                  key={spec}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, specialty: spec }));
                                    setSpecialtyQuery(spec);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100"
                                >
                                  {spec}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 mt-2">
                        32 other students from {currentUniForCaption} are active right now.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tighter">
                        When is your defense date?
                      </h1>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                          Defense date
                        </label>
                        {/* Minimal monochrome date picker */}
                        <input
                          type="date"
                          value={form.defenseDate}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              defenseDate: e.target.value,
                            }))
                          }
                          className="w-full bg-white border border-neutral-200 focus:border-black focus:outline-none focus:ring-0 px-3 py-2 text-sm appearance-none [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      </div>

                      <p className="text-xs text-neutral-500">
                        This date will power your days-remaining countdown on the main dashboard.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex justify-end">
            <motion.div layoutId="onboarding-next-button">
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className="inline-flex items-center gap-2 bg-black text-white hover:bg-black/90 rounded-[4px] px-6 py-2 h-10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium">
                  {step === STEP_COUNT - 1 ? "Finish" : "Next"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}

