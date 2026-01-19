/**
 * LaPista.ATX - Translations
 * English and Spanish language support
 */

const TRANSLATIONS = {
  en: {
    // Navigation
    'nav.games': 'Games',
    'nav.about': 'About',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',
    'nav.backToSchedule': 'Back to Schedule',

    // Language toggle
    'lang.toggle': 'ES',
    'lang.current': 'EN',

    // Hero Section
    'hero.tagline': "AUSTIN'S PICKUP SOCCER",
    'hero.title1': 'PLAY.',
    'hero.title2': 'CONNECT.',
    'hero.title3': 'COMPETE.',
    'hero.description': 'Join weekly pickup games at quality fields across Austin. All skill levels welcome. $5.99 per game.',
    'hero.cta': 'View Schedule',
    'hero.learnMore': 'Learn More',

    // Game Cards
    'game.spots': 'SPOTS',
    'game.full': 'FULL',
    'game.hot': 'HOT',
    'game.rsvp': 'RSVP NOW',
    'game.details': 'View Details',
    'game.upcoming': 'Upcoming Games',
    'game.noGames': 'No upcoming games scheduled.',
    'game.checkBack': 'Check back soon for new games!',
    'game.filterAll': 'All',

    // Game Details Page
    'gameDetails.backToSchedule': 'Back to Schedule',
    'gameDetails.openForRsvp': 'Open for RSVP',
    'gameDetails.gameId': 'GAME ID',
    'gameDetails.venueInfo': 'Venue Information',
    'gameDetails.gameDetails': 'Game Details',
    'gameDetails.pricePerPerson': 'Price Per Person',
    'gameDetails.availability': 'Availability',
    'gameDetails.filled': 'FILLED',
    'gameDetails.spotsRemaining': 'spots remaining',
    'gameDetails.skillLevel': 'Skill Level',
    'gameDetails.allLevels': 'Open to all skill levels',
    'gameDetails.whatToExpect': 'What to Expect',
    'gameDetails.getDirections': 'Get Directions',
    'gameDetails.gameChat': 'Game Chat',
    'gameDetails.gameChatDesc': 'Join the game chat for live updates, carpooling, and to connect with other players before the match.',
    'gameDetails.joinWhatsApp': 'Join WhatsApp Group',

    // RSVP Form
    'form.reserveSpot': 'Reserve Your Spot',
    'form.firstName': 'First Name',
    'form.lastName': 'Last Name',
    'form.email': 'Email Address',
    'form.phone': 'Phone Number',
    'form.phoneOptional': '(optional)',
    'form.addGuest': 'Add a Guest',
    'form.maxGuests': 'max',
    'form.removeGuest': 'Remove',
    'form.guest': 'Guest',
    'form.orderSummary': 'Order Summary',
    'form.standardAdmission': 'Standard Admission',
    'form.serviceFee': 'Service Fee',
    'form.totalDue': 'Total Due',
    'form.paymentMethod': 'Payment Method',
    'form.payNow': 'Pay Now',
    'form.cashApp': 'CashApp',
    'form.cashAppWarning': 'Payment Required:',
    'form.cashAppInstructions': 'You must pay via CashApp to',
    'form.cashAppBeforeGame': 'before the game. No payment = no play.',
    'form.waiver': 'I have read and agree to the',
    'form.liabilityWaiver': 'Liability Waiver',
    'form.payAndConfirm': 'Pay Now & Confirm',
    'form.reserveAndPay': 'Reserve Spot & Pay via CashApp',
    'form.processing': 'Processing...',
    'form.confirmationEmail': "You'll receive a confirmation email shortly.",
    'form.notEnoughSpots': 'Not enough spots available to add more guests.',

    // Waitlist
    'waitlist.title': 'Game Full',
    'waitlist.description': "Join the waitlist to get notified if a spot opens up.",
    'waitlist.name': 'Name',
    'waitlist.joinButton': 'Join Waitlist',
    'waitlist.onWaitlist': "On Waitlist!",
    'waitlist.successMessage': "You're on the waitlist! We'll email you if a spot opens.",
    'waitlist.peopleWaiting': 'people on waitlist',

    // Confirmation Page
    'confirmation.youreIn': "YOU'RE IN!",
    'confirmation.spotConfirmed': 'Your spot is confirmed.',
    'confirmation.bookingRef': 'Booking Ref',
    'confirmation.confirmed': 'Confirmed',
    'confirmation.people': 'People',
    'confirmation.person': 'Person',
    'confirmation.reservedBy': 'Reserved by',
    'confirmation.you': '(You)',
    'confirmation.guestLabel': '(Guest)',
    'confirmation.total': 'Total',
    'confirmation.status': 'Status',
    'confirmation.paidViaCard': 'Paid via Card',
    'confirmation.payViaCashApp': 'Pay via CashApp',
    'confirmation.addToCalendar': 'Add to Calendar',
    'confirmation.shareGame': 'Share Game',
    'confirmation.viewGameDetails': 'View Game Details',
    'confirmation.paymentRequired': 'Payment Required Before Game',
    'confirmation.mustPay': 'You selected CashApp payment.',
    'confirmation.mustPayBold': 'You must pay',
    'confirmation.viaCashApp': 'via CashApp before arriving',
    'confirmation.orNoPlay': ', or you will not be allowed to play.',
    'confirmation.spotReserved': 'Your spot is reserved but not confirmed until payment is received.',
    'confirmation.payViaCashAppTo': 'Pay via CashApp',
    'confirmation.includeCode': 'Include your confirmation code in the note:',
    'confirmation.payBeforeGame': 'Pay at least 1 hour before game time',
    'confirmation.importantInfo': 'Important Info',
    'confirmation.bringTurf': 'Bring turf shoes or cleats (no metal studs).',
    'confirmation.bringShirts': 'Bring a white and a dark shirt just in case.',
    'confirmation.openInMaps': 'Open Location in Maps',
    'confirmation.joinWhatsApp': 'Join Game WhatsApp Group',
    'confirmation.emailSent': 'A confirmation email has been sent to',
    'confirmation.checkSpam': "Check your spam folder if you don't see it.",
    'confirmation.needToCancel': 'Need to cancel?',
    'confirmation.cancelBooking': 'Cancel Booking',
    'confirmation.refundEligible': 'Paid bookings are eligible for a full refund.',

    // Cancel Page
    'cancel.title': 'Cancel Booking',
    'cancel.loading': 'Loading booking details...',
    'cancel.notFound': 'Booking Not Found',
    'cancel.notFoundDesc': "We couldn't find a booking with that confirmation code.",
    'cancel.backToHome': 'Back to Home',
    'cancel.confirmCancel': 'Confirm Cancellation',
    'cancel.enterEmail': 'Enter the email address used for this booking to confirm cancellation.',
    'cancel.emailLabel': 'Email Address',
    'cancel.cancelButton': 'Cancel This Booking',
    'cancel.keepBooking': 'Keep My Booking',
    'cancel.success': 'Booking Cancelled',
    'cancel.successDesc': 'Your booking has been cancelled successfully.',
    'cancel.refundMessage': 'If you paid online, your refund will be processed within 5-10 business days.',
    'cancel.alreadyCancelled': 'Already Cancelled',
    'cancel.alreadyCancelledDesc': 'This booking has already been cancelled.',

    // Footer
    'footer.explore': 'Explore',
    'footer.support': 'Support',
    'footer.follow': 'Follow',
    'footer.venues': 'Venues',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy Policy',
    'footer.termsOfService': 'Terms of Service',
    'footer.copyright': '© 2026 LaPista.ATX',

    // About Page
    'about.title': 'About LaPista.ATX',
    'about.subtitle': "Austin's Pickup Soccer Community",
    'about.heroTagline': 'Est. 2025 • Austin, Texas',
    'about.heroTitle1': 'About',
    'about.heroDesc': 'We are redefining the pickup culture in Austin. No memberships, no commitments—just pure football for the love of the game.',
    'about.communityFirst': 'Community First',
    'about.quote': '"Football is the one thing that brings us all together."',

    // Our Story
    'about.storyLabel': 'Our Story',
    'about.storyTitle': 'Born from the Sidelines',
    'about.storyPara1': 'LaPista started in 2025 by two brothers who love the beautiful game but struggled to find quality, consistent pickup games in Austin.',
    'about.storyPara2': 'Tired of cancelled games, uneven teams, and expensive league fees, we decided to build a platform that strips away the bureaucracy and focuses on what matters: playing.',
    'about.storyPara3': 'What began as a single WhatsApp group has grown into a city-wide network of players, from beginners to former pros, united by the pitch.',

    // Mission
    'about.mission': 'Our Mission',
    'about.missionTitle': "Building Austin's Community",
    'about.missionText': "We're building Austin's most welcoming pickup soccer community. Whether you're a seasoned player or just getting started, there's a spot for you on our pitch.",
    'about.valueInclusivity': 'Inclusivity',
    'about.valueInclusivityDesc': 'We believe football is for everyone. All backgrounds, all skill levels, all genders. No ego allowed on our fields.',
    'about.valueAccess': 'Access',
    'about.valueAccessDesc': 'We unlock underutilized urban spaces and turn them into vibrant pitches. "La Pista" means "The Court" or "The Track" – anywhere can be a game.',
    'about.valueQuality': 'Quality',
    'about.valueQualityDesc': 'Bibs, balls, organized teams, and dedicated hosts. We handle the logistics so you can focus on the game.',

    // Experience
    'about.expLabel': 'The Experience',
    'about.expTitle': 'What to Expect',
    'about.expDesc': 'Every LaPista game follows a standard to ensure safety and fun. Here is how we do things differently.',
    'about.findGame': 'Find a Game',
    'about.expHost': 'Dedicated Field Host',
    'about.expHostDesc': 'A staff member is always present to organize teams, keep time, and ensure fair play.',
    'about.expEquip': 'Equipment Provided',
    'about.expEquipDesc': 'Freshly washed bibs and match-quality balls provided at every single session.',
    'about.expSocial': 'Post-Game Socials',
    'about.expSocialDesc': "We often grab tacos or drinks after evening games. It's about the people, not just the points.",

    // CTA
    'about.ctaTitle': 'Ready to play?',
    'about.ctaDesc': 'Join over 500+ players in Austin active on LaPista weekly.',
    'about.viewSchedule': 'View Schedule',

    // FAQ Page
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Everything you need to know about playing with LaPista.ATX',

    // Contact Page
    'contact.title': 'Contact Us',
    'contact.subtitle': "Have a question? We'd love to hear from you.",
    'contact.nameLabel': 'Your Name',
    'contact.emailLabel': 'Email Address',
    'contact.subjectLabel': 'Subject',
    'contact.messageLabel': 'Message',
    'contact.sendButton': 'Send Message',
    'contact.sending': 'Sending...',
    'contact.success': 'Message sent! We\'ll get back to you soon.',

    // Errors
    'error.generic': 'Something went wrong. Please try again.',
    'error.alreadyRsvp': "You have already RSVP'd for this game",
    'error.notEnoughSpots': 'Not enough spots available',
    'error.gameNotFound': 'Game not found',
    'error.invalidEmail': 'Please enter a valid email address',
    'error.requiredFields': 'Please fill in all required fields',
    'error.paymentFailed': 'Payment failed. Please try again.',

    // Misc
    'misc.or': 'or',
    'misc.and': 'and',
    'misc.loading': 'Loading...',

    // Filters
    'filter.label': 'FILTERS:',
    'filter.all': 'ALL',
    'filter.south': 'SOUTH',
    'filter.east': 'EAST',
    'filter.north': 'NORTH',
    'filter.search': 'FIND A GAME...',
    'filter.noResults': 'No games match your filters.',
    'filter.tryAdjusting': 'Try adjusting your search or filter criteria.',

    // Home Page About Section
    'home.aboutTitle': 'ABOUT LAPISTA',
    'home.aboutPara1': "We started LaPista with a simple goal: to create the best pickup soccer experience in Austin. Organized games, quality fields, and a community that respects the game.",
    'home.aboutPara2': "Whether you're a former pro or just getting back into it, there's a spot for you on the pitch.",
    'home.learnMore': 'Learn More',
    'home.onThePitch': 'ON THE PITCH',

    // Contact Cards
    'contact.followUs': 'Follow Us',
    'contact.joinChat': 'Join Chat',
    'contact.emailUs': 'Email Us',
    'contact.whatsappGroup': 'WhatsApp Group',

    // Footer
    'footer.tagline': "Connecting Austin's soccer community, one game at a time.",
  },

  es: {
    // Navigation
    'nav.games': 'Partidos',
    'nav.about': 'Nosotros',
    'nav.faq': 'Preguntas',
    'nav.contact': 'Contacto',
    'nav.backToSchedule': 'Volver al Calendario',

    // Language toggle
    'lang.toggle': 'EN',
    'lang.current': 'ES',

    // Hero Section
    'hero.tagline': 'FÚTBOL PICKUP DE AUSTIN',
    'hero.title1': 'JUEGA.',
    'hero.title2': 'CONECTA.',
    'hero.title3': 'COMPITE.',
    'hero.description': 'Únete a partidos semanales en canchas de calidad en Austin. Todos los niveles son bienvenidos. $5.99 por partido.',
    'hero.cta': 'Ver Calendario',
    'hero.learnMore': 'Más Información',

    // Game Cards
    'game.spots': 'LUGARES',
    'game.full': 'LLENO',
    'game.hot': 'POPULAR',
    'game.rsvp': 'RESERVAR',
    'game.details': 'Ver Detalles',
    'game.upcoming': 'Próximos Partidos',
    'game.noGames': 'No hay partidos programados.',
    'game.checkBack': '¡Vuelve pronto para ver nuevos partidos!',
    'game.filterAll': 'Todos',

    // Game Details Page
    'gameDetails.backToSchedule': 'Volver al Calendario',
    'gameDetails.openForRsvp': 'Abierto para Reservas',
    'gameDetails.gameId': 'ID DEL PARTIDO',
    'gameDetails.venueInfo': 'Información del Lugar',
    'gameDetails.gameDetails': 'Detalles del Partido',
    'gameDetails.pricePerPerson': 'Precio por Persona',
    'gameDetails.availability': 'Disponibilidad',
    'gameDetails.filled': 'OCUPADOS',
    'gameDetails.spotsRemaining': 'lugares disponibles',
    'gameDetails.skillLevel': 'Nivel de Habilidad',
    'gameDetails.allLevels': 'Abierto a todos los niveles',
    'gameDetails.whatToExpect': 'Qué Esperar',
    'gameDetails.getDirections': 'Cómo Llegar',
    'gameDetails.gameChat': 'Chat del Partido',
    'gameDetails.gameChatDesc': 'Únete al chat para actualizaciones en vivo, compartir transporte y conectar con otros jugadores antes del partido.',
    'gameDetails.joinWhatsApp': 'Unirse al Grupo de WhatsApp',

    // RSVP Form
    'form.reserveSpot': 'Reserva Tu Lugar',
    'form.firstName': 'Nombre',
    'form.lastName': 'Apellido',
    'form.email': 'Correo Electrónico',
    'form.phone': 'Número de Teléfono',
    'form.phoneOptional': '(opcional)',
    'form.addGuest': 'Agregar Invitado',
    'form.maxGuests': 'máx',
    'form.removeGuest': 'Eliminar',
    'form.guest': 'Invitado',
    'form.orderSummary': 'Resumen del Pedido',
    'form.standardAdmission': 'Admisión Estándar',
    'form.serviceFee': 'Cargo por Servicio',
    'form.totalDue': 'Total a Pagar',
    'form.paymentMethod': 'Método de Pago',
    'form.payNow': 'Pagar Ahora',
    'form.cashApp': 'CashApp',
    'form.cashAppWarning': 'Pago Requerido:',
    'form.cashAppInstructions': 'Debes pagar vía CashApp a',
    'form.cashAppBeforeGame': 'antes del partido. Sin pago = sin jugar.',
    'form.waiver': 'He leído y acepto el',
    'form.liabilityWaiver': 'Exención de Responsabilidad',
    'form.payAndConfirm': 'Pagar y Confirmar',
    'form.reserveAndPay': 'Reservar y Pagar vía CashApp',
    'form.processing': 'Procesando...',
    'form.confirmationEmail': 'Recibirás un correo de confirmación en breve.',
    'form.notEnoughSpots': 'No hay suficientes lugares para agregar más invitados.',

    // Waitlist
    'waitlist.title': 'Partido Lleno',
    'waitlist.description': 'Únete a la lista de espera para ser notificado si se abre un lugar.',
    'waitlist.name': 'Nombre',
    'waitlist.joinButton': 'Unirse a la Lista',
    'waitlist.onWaitlist': '¡En la Lista!',
    'waitlist.successMessage': '¡Estás en la lista de espera! Te enviaremos un correo si se abre un lugar.',
    'waitlist.peopleWaiting': 'personas en espera',

    // Confirmation Page
    'confirmation.youreIn': '¡ESTÁS DENTRO!',
    'confirmation.spotConfirmed': 'Tu lugar está confirmado.',
    'confirmation.bookingRef': 'Ref. de Reserva',
    'confirmation.confirmed': 'Confirmado',
    'confirmation.people': 'Personas',
    'confirmation.person': 'Persona',
    'confirmation.reservedBy': 'Reservado por',
    'confirmation.you': '(Tú)',
    'confirmation.guestLabel': '(Invitado)',
    'confirmation.total': 'Total',
    'confirmation.status': 'Estado',
    'confirmation.paidViaCard': 'Pagado con Tarjeta',
    'confirmation.payViaCashApp': 'Pagar vía CashApp',
    'confirmation.addToCalendar': 'Agregar al Calendario',
    'confirmation.shareGame': 'Compartir Partido',
    'confirmation.viewGameDetails': 'Ver Detalles del Partido',
    'confirmation.paymentRequired': 'Pago Requerido Antes del Partido',
    'confirmation.mustPay': 'Seleccionaste pago por CashApp.',
    'confirmation.mustPayBold': 'Debes pagar',
    'confirmation.viaCashApp': 'vía CashApp antes de llegar',
    'confirmation.orNoPlay': ', o no podrás jugar.',
    'confirmation.spotReserved': 'Tu lugar está reservado pero no confirmado hasta recibir el pago.',
    'confirmation.payViaCashAppTo': 'Pagar vía CashApp',
    'confirmation.includeCode': 'Incluye tu código de confirmación en la nota:',
    'confirmation.payBeforeGame': 'Paga al menos 1 hora antes del partido',
    'confirmation.importantInfo': 'Información Importante',
    'confirmation.bringTurf': 'Trae zapatos de césped o tacos (sin tacos de metal).',
    'confirmation.bringShirts': 'Trae una camiseta blanca y una oscura por si acaso.',
    'confirmation.openInMaps': 'Abrir Ubicación en Mapas',
    'confirmation.joinWhatsApp': 'Unirse al Grupo de WhatsApp',
    'confirmation.emailSent': 'Se ha enviado un correo de confirmación a',
    'confirmation.checkSpam': 'Revisa tu carpeta de spam si no lo ves.',
    'confirmation.needToCancel': '¿Necesitas cancelar?',
    'confirmation.cancelBooking': 'Cancelar Reserva',
    'confirmation.refundEligible': 'Las reservas pagadas son elegibles para reembolso completo.',

    // Cancel Page
    'cancel.title': 'Cancelar Reserva',
    'cancel.loading': 'Cargando detalles de la reserva...',
    'cancel.notFound': 'Reserva No Encontrada',
    'cancel.notFoundDesc': 'No pudimos encontrar una reserva con ese código de confirmación.',
    'cancel.backToHome': 'Volver al Inicio',
    'cancel.confirmCancel': 'Confirmar Cancelación',
    'cancel.enterEmail': 'Ingresa el correo electrónico usado para esta reserva para confirmar la cancelación.',
    'cancel.emailLabel': 'Correo Electrónico',
    'cancel.cancelButton': 'Cancelar Esta Reserva',
    'cancel.keepBooking': 'Mantener Mi Reserva',
    'cancel.success': 'Reserva Cancelada',
    'cancel.successDesc': 'Tu reserva ha sido cancelada exitosamente.',
    'cancel.refundMessage': 'Si pagaste en línea, tu reembolso será procesado en 5-10 días hábiles.',
    'cancel.alreadyCancelled': 'Ya Cancelada',
    'cancel.alreadyCancelledDesc': 'Esta reserva ya ha sido cancelada.',

    // Footer
    'footer.explore': 'Explorar',
    'footer.support': 'Soporte',
    'footer.follow': 'Síguenos',
    'footer.venues': 'Lugares',
    'footer.terms': 'Términos',
    'footer.privacy': 'Política de Privacidad',
    'footer.termsOfService': 'Términos de Servicio',
    'footer.copyright': '© 2026 LaPista.ATX',

    // About Page
    'about.title': 'Sobre LaPista.ATX',
    'about.subtitle': 'La Comunidad de Fútbol Pickup de Austin',
    'about.heroTagline': 'Est. 2025 • Austin, Texas',
    'about.heroTitle1': 'Sobre',
    'about.heroDesc': 'Estamos redefiniendo la cultura del pickup en Austin. Sin membresías, sin compromisos—solo fútbol puro por amor al juego.',
    'about.communityFirst': 'Comunidad Primero',
    'about.quote': '"El fútbol es lo único que nos une a todos."',

    // Our Story
    'about.storyLabel': 'Nuestra Historia',
    'about.storyTitle': 'Nacidos desde las Gradas',
    'about.storyPara1': 'LaPista comenzó en 2025 por dos hermanos que aman el fútbol pero luchaban por encontrar partidos pickup de calidad y consistentes en Austin.',
    'about.storyPara2': 'Cansados de partidos cancelados, equipos desiguales y cuotas de liga caras, decidimos construir una plataforma que elimina la burocracia y se enfoca en lo que importa: jugar.',
    'about.storyPara3': 'Lo que comenzó como un simple grupo de WhatsApp ha crecido hasta convertirse en una red de jugadores de toda la ciudad, desde principiantes hasta ex profesionales, unidos por la cancha.',

    // Mission
    'about.mission': 'Nuestra Misión',
    'about.missionTitle': 'Construyendo la Comunidad de Austin',
    'about.missionText': 'Estamos construyendo la comunidad de fútbol pickup más acogedora de Austin. Ya seas un jugador experimentado o estés comenzando, hay un lugar para ti en nuestra cancha.',
    'about.valueInclusivity': 'Inclusividad',
    'about.valueInclusivityDesc': 'Creemos que el fútbol es para todos. Todos los orígenes, todos los niveles, todos los géneros. No se permite ego en nuestras canchas.',
    'about.valueAccess': 'Acceso',
    'about.valueAccessDesc': 'Desbloqueamos espacios urbanos subutilizados y los convertimos en canchas vibrantes. "La Pista" significa cualquier lugar puede ser un partido.',
    'about.valueQuality': 'Calidad',
    'about.valueQualityDesc': 'Petos, balones, equipos organizados y anfitriones dedicados. Nosotros manejamos la logística para que tú te enfoques en el juego.',

    // Experience
    'about.expLabel': 'La Experiencia',
    'about.expTitle': 'Qué Esperar',
    'about.expDesc': 'Cada partido de LaPista sigue un estándar para garantizar seguridad y diversión. Así es como hacemos las cosas diferente.',
    'about.findGame': 'Buscar Partido',
    'about.expHost': 'Anfitrión de Campo Dedicado',
    'about.expHostDesc': 'Un miembro del equipo siempre está presente para organizar equipos, llevar el tiempo y asegurar el juego limpio.',
    'about.expEquip': 'Equipo Proporcionado',
    'about.expEquipDesc': 'Petos recién lavados y balones de calidad de partido proporcionados en cada sesión.',
    'about.expSocial': 'Reuniones Post-Partido',
    'about.expSocialDesc': 'A menudo vamos por tacos o bebidas después de los partidos nocturnos. Se trata de las personas, no solo de los puntos.',

    // CTA
    'about.ctaTitle': '¿Listo para jugar?',
    'about.ctaDesc': 'Únete a más de 500+ jugadores activos en LaPista cada semana en Austin.',
    'about.viewSchedule': 'Ver Calendario',

    // FAQ Page
    'faq.title': 'Preguntas Frecuentes',
    'faq.subtitle': 'Todo lo que necesitas saber sobre jugar con LaPista.ATX',

    // Contact Page
    'contact.title': 'Contáctanos',
    'contact.subtitle': '¿Tienes una pregunta? Nos encantaría saber de ti.',
    'contact.nameLabel': 'Tu Nombre',
    'contact.emailLabel': 'Correo Electrónico',
    'contact.subjectLabel': 'Asunto',
    'contact.messageLabel': 'Mensaje',
    'contact.sendButton': 'Enviar Mensaje',
    'contact.sending': 'Enviando...',
    'contact.success': '¡Mensaje enviado! Te responderemos pronto.',

    // Errors
    'error.generic': 'Algo salió mal. Por favor intenta de nuevo.',
    'error.alreadyRsvp': 'Ya tienes una reserva para este partido',
    'error.notEnoughSpots': 'No hay suficientes lugares disponibles',
    'error.gameNotFound': 'Partido no encontrado',
    'error.invalidEmail': 'Por favor ingresa un correo electrónico válido',
    'error.requiredFields': 'Por favor completa todos los campos requeridos',
    'error.paymentFailed': 'El pago falló. Por favor intenta de nuevo.',

    // Misc
    'misc.or': 'o',
    'misc.and': 'y',
    'misc.loading': 'Cargando...',

    // Filters
    'filter.label': 'FILTROS:',
    'filter.all': 'TODOS',
    'filter.south': 'SUR',
    'filter.east': 'ESTE',
    'filter.north': 'NORTE',
    'filter.search': 'BUSCAR PARTIDO...',
    'filter.noResults': 'No hay partidos que coincidan con tus filtros.',
    'filter.tryAdjusting': 'Intenta ajustar tu búsqueda o criterios de filtro.',

    // Home Page About Section
    'home.aboutTitle': 'SOBRE LAPISTA',
    'home.aboutPara1': 'Comenzamos LaPista con un objetivo simple: crear la mejor experiencia de fútbol pickup en Austin. Partidos organizados, canchas de calidad y una comunidad que respeta el juego.',
    'home.aboutPara2': 'Ya seas un ex profesional o apenas estés volviendo al juego, hay un lugar para ti en la cancha.',
    'home.learnMore': 'Más Información',
    'home.onThePitch': 'EN LA CANCHA',

    // Contact Cards
    'contact.followUs': 'Síguenos',
    'contact.joinChat': 'Únete al Chat',
    'contact.emailUs': 'Escríbenos',
    'contact.whatsappGroup': 'Grupo de WhatsApp',

    // Footer
    'footer.tagline': 'Conectando la comunidad de fútbol de Austin, un partido a la vez.',
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.TRANSLATIONS = TRANSLATIONS;
}

// Export for Node.js (emails)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TRANSLATIONS;
}
