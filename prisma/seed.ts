import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for Zivo AI...');

  // 1. Seed Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zivo.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';

  if (process.env.NODE_ENV === 'production' && adminPassword === 'adminpassword123') {
    throw new Error('FATAL: Cannot seed default admin password in production. Please set a strong ADMIN_PASSWORD.');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user verified: ${admin.email}`);

  // 2. Seed Default Site Settings with updated WhatsApp & Google Sheet ID
  const defaultSettings = [
    { key: 'businessName', value: 'Zivo AI' },
    { key: 'logoUrl', value: '/logo.svg' },
    { key: 'phoneNumber', value: '+91 8220303164' },
    { key: 'whatsappNumber', value: '918220303164' },
    { key: 'supportEmail', value: 'support@zivo.ai' },
    { key: 'razorpayKeyId', value: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_sampleKeyId12345' },
    { key: 'googleSheetId', value: '15XfhBAF21seSRyDLfkPd4ulQnRafRRPMUVvXKK8iEb8' },
    { key: 'announcementNotice', value: '🔥 Production-Ready AI & Full-Stack Architectures with Instant Automated Delivery' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Site settings initialized (Zivo AI, WA: 8220303164)');

  // 3. Preserve existing enquiries and orders. Only clear if explicitly requested in non-production environments
  if (process.env.NODE_ENV !== 'production' && process.env.CLEAR_DEV_DATA === 'true') {
    await prisma.enquiry.deleteMany({});
    await prisma.order.deleteMany({});
    console.log('🧹 Dev dummy enquiries & orders cleared upon explicit CLEAR_DEV_DATA request.');
  } else {
    console.log('🛡️ Preserved existing enquiries and orders.');
  }


  // 4. Sample Projects Catalogue
  const sampleProjects = [
    {
      title: 'AI-Powered Brain Tumor Segmentation & Classification System',
      slug: 'ai-powered-brain-tumor-segmentation-classification',
      shortDescription: 'Deep learning framework using UNet and ResNet-50 for automated MRI brain tumor segmentation and sub-type classification.',
      fullDescription: 'This project presents an end-to-end artificial intelligence system designed for automated brain tumor region extraction from multi-modal MRI scans. Utilizing a modified 3D U-Net architecture paired with attention mechanisms, the model segments tumor core, active tumor, and edema regions with over 94.6% Dice Similarity Coefficient.',
      category: 'Artificial Intelligence',
      technologies: JSON.stringify(['Python', 'PyTorch', 'OpenCV', 'Streamlit', 'Medical Imaging']),
      difficulty: 'Advanced',
      projectType: 'Major',
      problemStatement: 'Manual annotation of brain tumors by radiologists is time-consuming, subjective, and prone to intra-observer variability during critical oncological diagnosis.',
      proposedSolution: 'An end-to-end deep convolutional neural network pipeline integrating 3D U-Net and Transfer Learning (ResNet-50) for fast, objective 3D MRI segmentation and grade classification.',
      features: JSON.stringify([
        'Interactive 3D slice visualization & overlay',
        'Automatic volume calculation of tumor regions in cm³',
        'Multi-class classification (Glioma, Meningioma, Pituitary)',
        'PDF Diagnostic Report Generator with patient details',
        'REST API endpoints for fast web integration'
      ]),
      modules: JSON.stringify([
        'DICOM Data Preprocessing & N4 Bias Field Correction',
        '3D U-Net Deep Neural Network Segmentation Engine',
        'Multi-class Tumor Classifier Module',
        'Interactive Web Dashboard Interface'
      ]),
      expectedOutput: 'High-accuracy pixel-wise tumor mask overlay, 3D mesh rendering, and structured medical diagnostic report.',
      requirements: 'Python 3.10+, PyTorch 2.0+, minimum 8GB RAM (GPU recommended for training).',
      workflow: 'Data Ingestion -> Bias Correction & Slice Normalization -> U-Net Segmentation Masking -> ResNet Classification -> Output Dashboard.',
      mainImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      demoVideo: 'https://www.youtube-nocookie.com/embed/aircAruvnKk',
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Research Paper', 'Report', 'Dataset', 'Installation Guide']),
      available: true,
      featured: true,
      salesType: 'fixed',
      price: 8500.0,
    },
    {
      title: 'Autonomous Drone Swarm Navigation & Target Tracking',
      slug: 'autonomous-drone-swarm-navigation-target-tracking',
      shortDescription: 'Multi-agent RL swarm control system for real-time search, obstacle avoidance, and target entrapment in GPS-denied environments.',
      fullDescription: 'Custom multi-agent reinforcement learning (MARL) algorithms trained in Isaac Gym. Enables dynamic drone formations to map uncharted disaster zones, maintain mesh communications, and track moving targets collaboratively.',
      category: 'Cybersecurity',
      technologies: JSON.stringify(['ROS2', 'Python', 'PyTorch', 'Gazebo', 'C++']),
      difficulty: 'Advanced',
      projectType: 'Research',
      problemStatement: 'Search and rescue teams struggle to operate effectively in collapsed buildings where GPS signals are jammed and human exploration is dangerous.',
      proposedSolution: 'Decentralized drone swarm utilizing LiDAR SLAM, ROS2 micro-node orchestration, and PPO-based multi-agent reinforcement learning for dynamic obstacle negotiation.',
      features: JSON.stringify([
        'Decentralized mesh topology with auto-healing fallback',
        'Real-time LiDAR 3D Occupancy Grid Mapping',
        'Dynamic Leader-Follower formation switching',
        'Hardware-in-the-loop PX4 autopilot integration'
      ]),
      modules: JSON.stringify([
        'ROS2 Micro-Node Communication Bridge',
        'Multi-Agent Reinforcement Learning Planner',
        '3D LiDAR SLAM & Point Cloud Synthesizer',
        'Gazebo Simulation Harness'
      ]),
      expectedOutput: 'Full ROS2 workspace, Gazebo world configuration, simulation recording video, and hardware deployment code.',
      requirements: 'Ubuntu 22.04 LTS, ROS2 Humble, Nvidia GPU with CUDA 11.8+.',
      workflow: 'Environment Spawning -> LiDAR SLAM Mapping -> Swarm Consensus Negotiation -> Target Tracking Execution.',
      mainImage: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
      demoVideo: 'https://www.youtube-nocookie.com/embed/aircAruvnKk',
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Customization', 'Installation Guide']),
      available: true,
      featured: true,
      salesType: 'call',
      price: 0.0,
    },
    {
      title: 'Decentralized E-Voting Platform with Zero-Knowledge Proofs',
      slug: 'decentralized-evoting-zero-knowledge-proofs',
      shortDescription: 'Ethereum blockchain voting system using zk-SNARKs for complete voter anonymity and tamper-proof election verification.',
      fullDescription: 'Production-ready Web3 application ensuring voter privacy while guaranteeing total auditability. Uses Circom zk-SNARK circuits to prove voter eligibility without revealing biometric or identity tokens on the public ledger.',
      category: 'Blockchain',
      technologies: JSON.stringify(['Solidity', 'Next.js', 'Ethers.js', 'Circom', 'Hardhat']),
      difficulty: 'Intermediate',
      projectType: 'Major',
      problemStatement: 'Traditional centralized digital voting platforms are vulnerable to administrator manipulation, database tampering, and voter coercion.',
      proposedSolution: 'Smart contract suite deployed on Sepolia Testnet with zk-SNARK proof submission, preventing double-voting while maintaining 100% cryptographic secret balloting.',
      features: JSON.stringify([
        'Metamask & Aadhaar-based Web3 Authentication',
        'On-chain vote tallying with zero-knowledge proof validation',
        'Immutable audit log with real-time analytics graphs',
        'Gas-optimized smart contracts using ERC-1155 tokens'
      ]),
      modules: JSON.stringify([
        'Circom Cryptographic Proof Generator',
        'Solidity Smart Contract Ballot Manager',
        'Next.js Web3 Frontend Portal',
        'Hardhat Automated Test Suite'
      ]),
      expectedOutput: 'Deployed Sepolia smart contract code, Circom proof circuits, and responsive React frontend.',
      requirements: 'Node.js 18+, Metamask Wallet extension, Node provider key (Infura/Alchemy).',
      workflow: 'Identity Verification -> ZK Proof Generation -> Smart Contract Verification -> On-Chain Immutable Tally.',
      mainImage: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      demoVideo: null,
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Report', 'Installation Guide']),
      available: true,
      featured: true,
      salesType: 'fixed',
      price: 6999.0,
    },
    {
      title: 'Smart IoT Precision Agriculture & Automated Irrigation System',
      slug: 'smart-iot-precision-agriculture-automated-irrigation',
      shortDescription: 'ESP32 IoT sensor node network with ML-driven soil moisture forecasting and automated solar pump activation.',
      fullDescription: 'Comprehensive IoT project featuring distributed wireless sensor nodes (NPK, Soil Moisture, Temp, Humidity) feeding into an MQTT broker. Machine learning models predict crop water requirements 48 hours in advance.',
      category: 'IoT',
      technologies: JSON.stringify(['ESP32', 'Arduino', 'Python', 'MQTT', 'Node-RED', 'React']),
      difficulty: 'Intermediate',
      projectType: 'Major',
      problemStatement: 'Inconsistent irrigation and unmonitored soil nutrient depletion lead to reduced crop yield and extreme water wastage in modern agriculture.',
      proposedSolution: 'Low-power ESP32 Wi-Fi/LoRa sensor nodes communicating over MQTT to a centralized cloud server running XGBoost irrigation predictors.',
      features: JSON.stringify([
        'Real-time sensor telemetry streaming (5s interval)',
        'Automated relay control for irrigation valves & pumps',
        'Weather forecast integration API for smart rain skip',
        'WhatsApp alert notifications via Twilio API'
      ]),
      modules: JSON.stringify([
        'ESP32 Sensor Firmware & Wi-Fi Provisioner',
        'Node-RED MQTT Broker Pipeline',
        'Machine Learning Water Demand Forecaster',
        'Mobile-friendly Monitoring Web App'
      ]),
      expectedOutput: 'Arduino code (.ino), Circuit Schematic Diagram (Fritzing), Python backend server, and Web App UI.',
      requirements: 'ESP32 Development Board, Soil Sensors, Relay Module, Python 3.9+.',
      workflow: 'Sensor Sensing -> MQTT Publish -> ML Irrigation Recommendation -> Relay Actuation.',
      mainImage: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: null,
      demoVideo: null,
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Report', 'Installation Guide']),
      available: true,
      featured: false,
      salesType: 'fixed',
      price: 5499.0,
    },
    {
      title: 'Generative AI Customer Support Bot with Enterprise RAG',
      slug: 'generative-ai-customer-support-bot-enterprise-rag',
      shortDescription: 'Enterprise Retrieval-Augmented Generation chatbot built with LlamaIndex, LangChain, and Qdrant Vector Store.',
      fullDescription: 'Custom GenAI solution allowing companies to index internal documentation (PDFs, Notion, Confluence, SQL schemas) and answer complex customer queries with citation tracking and hallucination guardrails.',
      category: 'Generative AI',
      technologies: JSON.stringify(['Python', 'LangChain', 'OpenAI API', 'Qdrant', 'FastAPI', 'Next.js']),
      difficulty: 'Intermediate',
      projectType: 'Major',
      problemStatement: 'Generic LLMs generate inaccurate responses (hallucinations) when asked about private domain-specific company policies.',
      proposedSolution: 'Hybrid RAG architecture combining dense vector embeddings with sparse BM25 keyword search, powered by OpenAI GPT-4o and NeMo Guardrails.',
      features: JSON.stringify([
        'Multi-format file uploader (PDF, DOCX, CSV, TXT)',
        'Verifiable source text snippet citations',
        'Real-time streaming token response',
        'Admin knowledge base management portal'
      ]),
      modules: JSON.stringify([
        'Document Chunking & Vector Ingestion Engine',
        'Hybrid Semantic Retriever & Reranker',
        'FastAPI Conversation State Manager',
        'Modern Chat UI Component System'
      ]),
      expectedOutput: 'Full Python backend source code, Vector DB setup script, and Next.js chat interface.',
      requirements: 'Python 3.10+, OpenAI API Key or local Ollama instance.',
      workflow: 'Document Upload -> Vector Indexing -> Semantic Search Retrieval -> Guardrailed Response Generation.',
      mainImage: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: null,
      demoVideo: null,
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Research Paper', 'Report', 'Installation Guide', 'Customization']),
      available: true,
      featured: true,
      salesType: 'call',
      price: 0.0,
    },
    {
      title: 'Real-Time Cyber Threat Detection & Intrusion Prevention with ML',
      slug: 'realtime-cyber-threat-detection-intrusion-prevention-ml',
      shortDescription: 'Network packet inspector analyzing PCAP dumps using Random Forest and Isolation Forests to detect zero-day DDoS and SQLi attacks.',
      fullDescription: 'Cybersecurity analytics suite capturing raw network interfaces via Scapy. Extracts 42 network flow features and flags malicious anomalies in less than 15ms.',
      category: 'Cybersecurity',
      technologies: JSON.stringify(['Python', 'Scapy', 'Scikit-Learn', 'Elasticsearch', 'Kibana']),
      difficulty: 'Intermediate',
      projectType: 'Major',
      problemStatement: 'Signature-based Intrusion Detection Systems (IDS) fail to detect novel zero-day exploits and polymorphic malware.',
      proposedSolution: 'Unsupervised and supervised machine learning ensemble model trained on NSL-KDD and CICIDS2017 datasets for live packet stream anomaly scoring.',
      features: JSON.stringify([
        'Live Ethernet & Wi-Fi adapter packet capture stream',
        'Zero-day attack anomaly detection score',
        'Automated IP ban via iptables rule injection',
        'Kibana SIEM dashboard visualizer'
      ]),
      modules: JSON.stringify([
        'Scapy Live Packet Sniffer & Feature Extractor',
        'ML Anomaly Engine & Classifier Model',
        'Automated Firewall Rule Enforcer',
        'SIEM Log Pipeline Bridge'
      ]),
      expectedOutput: 'Python packet sniffer script, trained ML pkl models, sample PCAP test suite, and PDF report.',
      requirements: 'Python 3.9+, Wireshark/Npcap driver installed.',
      workflow: 'Packet Capture -> Flow Aggregation -> ML Feature Extraction -> Threat Scoring -> Firewall Action.',
      mainImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'
      ]),
      architectureImage: null,
      demoVideo: null,
      includedMaterials: JSON.stringify(['Source Code', 'Documentation', 'PPT', 'Research Paper', 'Report', 'Installation Guide']),
      available: true,
      featured: true,
      salesType: 'fixed',
      price: 6499.0,
    }
  ];

  if (process.env.SEED_SAMPLE_PROJECTS === 'true') {
    for (const projectData of sampleProjects) {
      await prisma.project.upsert({
        where: { slug: projectData.slug },
        update: projectData,
        create: projectData,
      });
    }
    console.log(`✅ Sample projects catalog seeded (${sampleProjects.length} projects).`);
  } else {
    console.log('ℹ️ Skipping sample project catalogue seeding (SEED_SAMPLE_PROJECTS is not "true"). Database remains clean with 0 dummy projects.');
  }

  console.log('🎉 Zivo AI database seed complete: Admin user and site settings ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
