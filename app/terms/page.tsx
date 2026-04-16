import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white pb-32">
      {/* Header */}
      <header className="border-b border-black/10 py-6 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 bg-black flex items-center justify-center text-white font-black text-xl hover:scale-95 transition-transform">
            L
          </Link>
          <span className="font-bold tracking-tight uppercase text-sm">Latexo</span>
        </div>
        <div className="text-right hidden md:block">
          <span className="font-mono text-[10px] tracking-[2px] uppercase text-neutral-500 block">Document Officiel</span>
          <span className="font-mono text-[10px] text-neutral-400 block mt-1">Version 1.0 — Avril 2026</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 md:px-8 mt-16 md:mt-24 space-y-20">
        
        {/* Title Block */}
        <div>
          <p className="font-mono text-[10px] tracking-[3px] text-neutral-400 uppercase mb-4">Conditions Générales d'Utilisation</p>
          <h1 className="text-5xl md:text-[5.5rem] font-black tracking-tighter uppercase leading-[0.9] mb-8">
            Conditions<br/>d'utilisation<br/>de Latexo
          </h1>
          <p className="text-neutral-500 text-lg leading-relaxed max-w-xl">
            En accédant à la plateforme Latexo et en utilisant ses services, vous acceptez d'être lié par les présentes conditions générales d'utilisation. Veuillez les lire attentivement avant d'utiliser le service.
          </p>
        </div>

        {/* Sommaire */}
        <div className="bg-neutral-50 p-6 md:p-8 border border-black/10 shadow-[4px_4px_0px_#000] relative">
          <p className="font-mono text-[10px] tracking-widest uppercase text-neutral-500 mb-6">Sommaire</p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 font-mono text-[11px] uppercase tracking-wide">
            <a href="#s1" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">01. Présentation du service</a>
            <a href="#s2" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">02. Acceptation des conditions</a>
            <a href="#s3" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">03. Compte utilisateur</a>
            <a href="#s4" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">04. Crédits et paiements</a>
            <a href="#s5" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">05. Politique de remboursement</a>
            <a href="#s6" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">06. Utilisation du service</a>
            <a href="#s7" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">07. Données personnelles</a>
            <a href="#s8" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">08. Documents téléchargés</a>
            <a href="#s9" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">09. Limitation de responsabilité</a>
            <a href="#s10" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">10. Suspension de compte</a>
            <a href="#s11" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">11. Propriété intellectuelle</a>
            <a href="#s12" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">12. Modifications des CGU</a>
            <a href="#s13" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">13. Droit applicable</a>
            <a href="#s14" className="hover:text-black text-neutral-600 hover:underline underline-offset-4">14. Contact</a>
          </div>
        </div>

        <div className="space-y-16">
          {/* SECTION 1 */}
          <section id="s1" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">01</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Présentation du service</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>Latexo est une plateforme de simulation de soutenance de Projet de Fin d'Études (PFE), accessible à l'adresse <strong className="text-black">latexo.tn</strong>. Le service propose aux utilisateurs de simuler une session de soutenance orale face à des agents d'intelligence artificielle représentant un jury académique.</p>
              <p>La plateforme analyse le rapport PFE téléchargé par l'utilisateur, identifie les sections potentiellement faibles, et génère des questions ciblées posées par trois agents IA distincts : <strong className="text-black">Dr. Souad</strong> (experte en méthodologie), <strong className="text-black">Prof. Malek</strong> (réviseur technique) et <strong className="text-black">Dr. Amir</strong> (analyste de recherche).</p>
              <p>Latexo est édité et exploité par un prestataire indépendant basé en Tunisie. Le service est accessible en ligne via un navigateur web compatible.</p>
            </div>
          </section>

          {/* SECTION 2 */}
          <section id="s2" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">02</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Acceptation des conditions</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>L'accès et l'utilisation de la plateforme Latexo impliquent l'acceptation pleine et entière des présentes Conditions Générales d'Utilisation (CGU).</p>
              <p>En créant un compte, en achetant des crédits ou en démarrant une session de simulation, l'utilisateur reconnaît avoir lu, compris et accepté l'intégralité des présentes conditions.</p>
              <div className="bg-neutral-50 border border-black/10 p-5 mt-6 font-medium text-black shadow-[3px_3px_0px_#000]">
                Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la plateforme Latexo. L'accès au service vaut acceptation inconditionnelle des présentes CGU.
              </div>
            </div>
          </section>

          {/* SECTION 3 */}
          <section id="s3" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">03</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Compte utilisateur</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-8 text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Création du compte</h3>
                <p>L'accès aux fonctionnalités de Latexo nécessite la création d'un compte personnel. L'utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son inscription.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Unicité du compte</h3>
                <p>Chaque utilisateur ne peut posséder qu'<strong className="text-black">un seul compte</strong> sur la plateforme. La création de plusieurs comptes par une même personne, notamment dans le but de bénéficier à plusieurs reprises de l'essai gratuit ou de contourner une suspension, est strictement interdite et constitue une fraude.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Responsabilité du compte</h3>
                <p>L'utilisateur est seul responsable de la confidentialité de ses identifiants de connexion et de toutes les actions effectuées depuis son compte. Toute utilisation non autorisée du compte doit être signalée immédiatement à Latexo via les coordonnées indiquées à la section 14.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Interdiction de partage</h3>
                <p>Le compte Latexo est strictement personnel et non cessible. Il est interdit de partager, prêter, vendre ou transférer son accès à un tiers, que ce soit à titre gratuit ou onéreux.</p>
              </div>
            </div>
          </section>

          {/* SECTION 4 */}
          <section id="s4" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">04</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Crédits et paiements</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-8 text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Système de crédits</h3>
                <p>L'accès aux sessions de simulation payantes est conditionné à la détention d'un solde de crédits suffisant sur le compte de l'utilisateur. Les crédits sont acquis par l'achat de packs proposés sur la plateforme.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Packs disponibles</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong className="text-black">Starter</strong> — 30 crédits — 9,000 DT</li>
                  <li><strong className="text-black">Defense</strong> — 80 crédits — 19,000 DT</li>
                  <li><strong className="text-black">Serious</strong> — 200 crédits — 39,000 DT</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Modalités de paiement</h3>
                <p>Les paiements sont effectués via le service de transfert mobile <strong className="text-black">D17</strong>. L'utilisateur effectue un virement du montant exact correspondant au pack choisi vers le numéro D17 de Latexo, puis renseigne son propre numéro D17 sur la plateforme pour permettre l'identification du paiement.</p>
                <p className="mt-2">Les crédits sont crédités sur le compte de l'utilisateur après vérification manuelle du paiement par l'équipe Latexo. Ce délai est généralement inférieur à 30 minutes pendant les heures ouvrables.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Validité des crédits</h3>
                <div className="bg-neutral-50 border border-black/10 p-5 font-medium text-black shadow-[3px_3px_0px_#000]">
                  Les crédits Latexo n'ont pas de date d'expiration. Les crédits acquis restent disponibles sur le compte de l'utilisateur sans limitation de durée, sous réserve que le compte ne soit pas suspendu ou supprimé.
                </div>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Consommation des crédits</h3>
                <p>Le nombre de crédits consommés par session dépend de la durée choisie :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Session 5 minutes — 10 crédits</li>
                  <li>Session 15 minutes — 20 crédits</li>
                  <li>Session 30 minutes — 30 crédits</li>
                </ul>
                <p className="mt-2">Les crédits sont déduits au démarrage de la session. Toute session démarrée est considérée comme consommée, quelle qu'en soit la durée effective.</p>
              </div>
            </div>
          </section>

          {/* SECTION 5 */}
          <section id="s5" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">05</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Politique de remboursement</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <div className="bg-red-50 border border-red-200 p-5 font-medium text-red-900 shadow-[3px_3px_0px_#fca5a5]">
                <strong className="text-red-950">Aucun remboursement ne sera effectué,</strong> quelles que soient les circonstances. En procédant à un achat de crédits sur Latexo, l'utilisateur reconnaît expressément et accepte cette politique de non-remboursement.
              </div>
              <p>Cette politique s'applique notamment dans les cas suivants, sans que cette liste soit limitative :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Crédits achetés mais non utilisés</li>
                <li>Insatisfaction vis-à-vis du service</li>
                <li>Soutenance annulée ou reportée</li>
                <li>Interruption technique d'une session</li>
                <li>Suspension du compte pour violation des CGU</li>
                <li>Fermeture volontaire du compte par l'utilisateur</li>
              </ul>
              <p>En cas d'interruption technique avérée imputable exclusivement à Latexo, une compensation en crédits pourra être accordée à la discrétion de l'équipe Latexo, sans que cela constitue un droit acquis ou une obligation contractuelle.</p>
            </div>
          </section>

          {/* SECTION 6 */}
          <section id="s6" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">06</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Utilisation du service</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-8 text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Usage autorisé</h3>
                <p>Le service Latexo est destiné exclusivement à un usage personnel dans le cadre de la préparation à une soutenance académique. L'utilisateur s'engage à utiliser la plateforme de manière loyale et conforme aux présentes CGU.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Usages interdits</h3>
                <p>Il est formellement interdit à l'utilisateur de :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Tenter de contourner le système de crédits ou d'accéder à des sessions sans paiement légitime</li>
                  <li>Utiliser des moyens automatisés, robots ou scripts pour interagir avec la plateforme</li>
                  <li>Tenter d'accéder aux systèmes, bases de données ou API de Latexo sans autorisation</li>
                  <li>Reproduire, copier, vendre ou redistribuer tout ou partie du service sans autorisation écrite préalable</li>
                  <li>Soumettre des contenus illicites, diffamatoires, offensants ou contraires à la loi tunisienne</li>
                  <li>Usurper l'identité d'un tiers lors de l'inscription ou de l'utilisation du service</li>
                  <li>Effectuer des paiements frauduleux ou contester abusivement des transactions D17</li>
                  <li>Créer plusieurs comptes afin de bénéficier à répétition de l'essai gratuit</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Essai gratuit</h3>
                <p>Chaque utilisateur bénéficie d'une session d'essai gratuite de 5 minutes, accordée une seule fois à la création du compte. Cette session d'essai est non renouvelable et non transférable.</p>
              </div>
            </div>
          </section>

          {/* SECTION 7 */}
          <section id="s7" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">07</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Données personnelles</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-8 text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Données collectées</h3>
                <p>Dans le cadre de la fourniture du service, Latexo collecte et traite les données personnelles suivantes :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Adresse email et informations de profil (nom, université, spécialité, date de soutenance)</li>
                  <li>Données de session : scores obtenus, durée des sessions, questions posées, feedback généré</li>
                  <li>Données de paiement : montant, numéro D17 fourni, référence de commande</li>
                  <li>Données techniques : adresse IP, type de navigateur, données de connexion</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Finalité du traitement</h3>
                <p>Ces données sont utilisées exclusivement pour :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Fournir et améliorer le service de simulation</li>
                  <li>Gérer les comptes utilisateurs et les paiements</li>
                  <li>Calculer le score de préparation et les métriques de progression</li>
                  <li>Envoyer des communications relatives au service (confirmation de paiement, rappels de soutenance)</li>
                  <li>Assurer la sécurité et prévenir les fraudes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Conservation des données</h3>
                <p>Les données personnelles sont conservées pendant la durée d'activité du compte et jusqu'à 12 mois après la dernière connexion. Les données de paiement sont conservées conformément aux obligations légales en vigueur.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Droits de l'utilisateur</h3>
                <p>Conformément à la législation tunisienne en vigueur, l'utilisateur dispose d'un droit d'accès, de rectification et de suppression de ses données personnelles. Pour exercer ces droits, l'utilisateur peut contacter Latexo aux coordonnées indiquées à la section 14.</p>
              </div>
            </div>
          </section>

          {/* SECTION 8 */}
          <section id="s8" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">08</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Documents téléchargés</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>L'utilisateur peut télécharger son rapport PFE sur la plateforme afin de personnaliser la simulation. En téléchargeant un document, l'utilisateur déclare et garantit :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Être l'auteur du document ou disposer des droits nécessaires pour le soumettre</li>
                <li>Que le document ne contient pas de données personnelles de tiers sans leur consentement</li>
                <li>Que le document ne contient aucun contenu illicite</li>
              </ul>
              <div className="bg-neutral-50 border border-black/10 p-5 mt-4 font-medium text-black shadow-[3px_3px_0px_#000]">
                Latexo stocke les rapports téléchargés uniquement dans le but de fournir le service de simulation. Les rapports ne sont pas utilisés à d'autres fins, ne sont pas partagés avec des tiers, et ne servent pas à l'entraînement de modèles d'intelligence artificielle.
              </div>
              <p>L'utilisateur conserve l'intégralité des droits de propriété intellectuelle sur les documents qu'il télécharge. Latexo ne revendique aucun droit sur les contenus soumis par les utilisateurs.</p>
              <p>L'utilisateur peut demander la suppression de ses documents téléchargés à tout moment en contactant l'équipe Latexo.</p>
            </div>
          </section>

          {/* SECTION 9 */}
          <section id="s9" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">09</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Limitation de responsabilité</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-8 text-neutral-700 leading-relaxed">
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Nature du service</h3>
                <div className="bg-amber-50 border border-amber-200 p-5 font-medium text-amber-900 shadow-[3px_3px_0px_#fcd34d] mb-4">
                  <strong className="text-amber-950">Latexo est un outil de simulation uniquement.</strong> Les sessions de simulation, les scores obtenus, les feedbacks générés et les questions posées par les agents IA ne constituent en aucun cas une garantie, une prédiction ou une assurance quant aux résultats obtenus lors d'une soutenance réelle.
                </div>
                <p>Les performances d'un utilisateur sur Latexo peuvent différer significativement de celles obtenues lors de sa soutenance réelle, en raison notamment :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>De la variabilité des comportements et attentes des jurys académiques réels</li>
                  <li>De la nature simulée et non réelle des agents IA</li>
                  <li>Des conditions psychologiques, physiques et contextuelles le jour de la soutenance</li>
                  <li>De la qualité et de l'exhaustivité du rapport soumis pour analyse</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Disponibilité du service</h3>
                <p>Latexo s'efforce d'assurer la disponibilité continue du service mais ne garantit pas une disponibilité ininterrompue. Des interruptions techniques peuvent survenir pour des raisons de maintenance, de mise à jour ou de force majeure. Latexo ne saurait être tenu responsable des préjudices résultant d'une interruption de service.</p>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase tracking-wide text-sm mb-2">Plafond de responsabilité</h3>
                <p>En tout état de cause, la responsabilité de Latexo ne saurait excéder le montant total des sommes effectivement payées par l'utilisateur au cours des 30 jours précédant le fait générateur du dommage.</p>
              </div>
            </div>
          </section>

          {/* SECTION 10 */}
          <section id="s10" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">10</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Suspension de compte</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>Latexo se réserve le droit de suspendre ou de supprimer définitivement tout compte utilisateur, sans préavis ni remboursement, dans les cas suivants :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Violation des présentes CGU, notamment les usages interdits définis à la section 6</li>
                <li>Tentative de fraude, notamment paiement non honoré ou contestation abusive</li>
                <li>Création de plusieurs comptes par un même utilisateur</li>
                <li>Partage ou revente de l'accès au compte à des tiers</li>
                <li>Comportement abusif à l'égard du service ou de l'équipe Latexo</li>
                <li>Utilisation du service à des fins illégales</li>
              </ul>
              <p>En cas de suspension pour fraude avérée, Latexo se réserve le droit de prendre toutes les mesures légales nécessaires pour protéger ses intérêts, conformément au droit tunisien applicable.</p>
              <div className="bg-neutral-50 border border-black/10 p-5 mt-4 font-medium text-black shadow-[3px_3px_0px_#000]">
                En cas de suspension, les crédits restants sur le compte sont perdus et ne donnent lieu à aucun remboursement.
              </div>
            </div>
          </section>

          {/* SECTION 11 */}
          <section id="s11" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">11</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Propriété intellectuelle</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>L'ensemble des éléments constitutifs de la plateforme Latexo — notamment le nom, le logo, le design, le code source, les agents IA, les prompts, les algorithmes, les textes et les interfaces — sont la propriété exclusive de Latexo et sont protégés par les lois relatives à la propriété intellectuelle applicables en Tunisie.</p>
              <p>Toute reproduction, représentation, modification, publication ou exploitation de tout ou partie de ces éléments, sous quelque forme que ce soit, sans l'autorisation écrite préalable de Latexo, est strictement interdite et constitue une contrefaçon.</p>
              <p>L'utilisateur bénéficie d'un droit d'utilisation personnel, non exclusif, non transférable et révocable de la plateforme, dans les seules limites définies par les présentes CGU.</p>
            </div>
          </section>

          {/* SECTION 12 */}
          <section id="s12" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">12</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Modifications des CGU</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>Latexo se réserve le droit de modifier les présentes Conditions Générales d'Utilisation à tout moment.</p>
              <p>En cas de <strong className="text-black">modification substantielle</strong> — notamment en ce qui concerne la politique de paiement, les droits des utilisateurs, la protection des données ou les limitations de responsabilité — les utilisateurs seront notifiés par email à l'adresse associée à leur compte, dans un délai raisonnable avant l'entrée en vigueur des nouvelles conditions.</p>
              <p>Les modifications mineures (corrections orthographiques, clarifications rédactionnelles sans impact sur les droits des parties) peuvent être apportées sans notification préalable.</p>
              <div className="bg-neutral-50 border border-black/10 p-5 mt-4 font-medium text-black shadow-[3px_3px_0px_#000]">
                La poursuite de l'utilisation du service après l'entrée en vigueur des nouvelles conditions vaut acceptation de celles-ci. Si l'utilisateur refuse les nouvelles conditions, il doit cesser d'utiliser le service et peut demander la suppression de son compte.
              </div>
            </div>
          </section>

          {/* SECTION 13 */}
          <section id="s13" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">13</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Droit applicable et juridiction</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>Les présentes Conditions Générales d'Utilisation sont régies et interprétées conformément au <strong className="text-black">droit tunisien</strong>.</p>
              <p>En cas de litige relatif à l'interprétation, l'exécution ou la résiliation des présentes CGU, les parties s'engagent à rechercher une résolution amiable dans un délai de 30 jours à compter de la notification du différend.</p>
              <p>À défaut de résolution amiable, tout litige sera soumis à la compétence exclusive des <strong className="text-black">tribunaux tunisiens compétents</strong>.</p>
            </div>
          </section>

          {/* SECTION 14 / CONTACT */}
          <section id="s14" className="scroll-mt-32">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="font-mono text-xs text-neutral-400">14</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Contact</h2>
            </div>
            <div className="pl-0 md:pl-8 space-y-4 text-neutral-700 leading-relaxed">
              <p>Pour toute question relative aux présentes CGU, à votre compte, à un paiement ou à une réclamation, vous pouvez contacter l'équipe Latexo :</p>
            </div>
            
            <div className="mt-8 ml-0 md:ml-8 border-2 border-black bg-black text-white p-8 space-y-6">
              <p className="font-mono text-[10px] tracking-widest uppercase text-neutral-400">Nous contacter</p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2"><span className="text-neutral-400 w-20 shrink-0">Email:</span> <a href="mailto:latexo.students@gmail.com" className="hover:underline text-white font-mono text-xs">latexo.students@gmail.com</a></p>
                <p className="flex items-center gap-2"><span className="text-neutral-400 w-20 shrink-0">WhatsApp:</span> <a href="https://wa.me/21651133796" className="hover:underline text-white font-mono text-xs">+216 51133796</a></p>
                <p className="flex items-center gap-2"><span className="text-neutral-400 w-20 shrink-0">Site web:</span> <a href="https://latexo.tn" className="hover:underline text-white font-mono text-xs">latexo.tn</a></p>
              </div>
              <div className="pt-6 border-t border-white/20 mt-6 text-[10px] font-mono text-neutral-500 leading-relaxed">
                <p>Latexo — Simulateur de Soutenance PFE</p>
                <p>Tunisie · Version CGU 1.0 · Avril 2026</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <footer className="max-w-3xl border-t border-black/10 mx-auto mt-24 pt-8 px-6 md:px-8 flex items-center justify-between font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
        <span>LATEXO · CGU Version 1.0</span>
        <Link href="/" className="hover:text-black">latexo.tn</Link>
      </footer>
    </div>
  );
}
