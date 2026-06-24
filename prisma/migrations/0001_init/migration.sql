-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "prenom" TEXT,
    "telephone" TEXT NOT NULL,
    "dateNaissance" TEXT,
    "email" TEXT,
    "societe" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "doNotCall" BOOLEAN NOT NULL DEFAULT false,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "vapiCallId" TEXT,
    "agentId" TEXT,
    "campaignId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'initie',
    "duree" INTEGER,
    "transcript" TEXT,
    "resume" TEXT,
    "recordingUrl" TEXT,
    "leadScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "langue" TEXT NOT NULL DEFAULT 'fr',
    "modele" TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
    "voix" TEXT NOT NULL DEFAULT 'charlotte',
    "messageAccueil" TEXT NOT NULL,
    "scriptCommercial" TEXT NOT NULL,
    "notesObjections" TEXT NOT NULL DEFAULT '',
    "objectif" TEXT NOT NULL DEFAULT '',
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "transferPhone" TEXT NOT NULL DEFAULT '',
    "triggerPhrases" TEXT NOT NULL DEFAULT '[]',
    "vapiAssistantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "concurrency" INTEGER NOT NULL DEFAULT 3,
    "heureDebut" TEXT NOT NULL DEFAULT '09:00',
    "heureFin" TEXT NOT NULL DEFAULT '20:00',
    "filtreStatut" TEXT,
    "prospectIds" TEXT NOT NULL DEFAULT '[]',
    "totalProspects" INTEGER NOT NULL DEFAULT 0,
    "applesEffectues" INTEGER NOT NULL DEFAULT 0,
    "applesReussis" INTEGER NOT NULL DEFAULT 0,
    "applesEchec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Call_vapiCallId_key" ON "Call"("vapiCallId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
