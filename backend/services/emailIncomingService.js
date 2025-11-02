// services/inboundEmailService.js
// import { simpleParser } from "mailparser";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";

/**
 * Service handling inbound emails received from SES via SNS
 */

/**
 * Trouve un ticket par correspondance partielle (6 derniers caractères de l'ObjectID)
 * @param {string} partialId - Les 6 derniers caractères de l'ObjectID
 * @returns {Promise<Object|null>} Le ticket trouvé ou null
 */
const findTicketByPartialId = async (partialId) => {
  try {
    // Recherche par regex pour trouver les ObjectIDs qui se terminent par les 6 caractères donnés
    const regex = new RegExp(`${partialId}$`);
    const ticket = await Ticket.findOne({ _id: { $regex: regex } });
    return ticket;
  } catch (error) {
    console.error('Erreur lors de la recherche du ticket par ID partiel:', error);
    return null;
  }
};

/**
 * Trouve un utilisateur par email
 * @param {string} email - L'email de l'utilisateur
 * @returns {Promise<Object|null>} L'utilisateur trouvé ou null
 */
const findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    return user;
  } catch (error) {
    console.error('Erreur lors de la recherche de l\'utilisateur par email:', error);
    return null;
  }
};

  /**
   * Main Express handler
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
const handleInboundEmail = async (req, res) => {
    try {
      const message = JSON.parse(req.body);

      // STEP 1 — Confirm SNS subscription
      if (message.Type === "SubscriptionConfirmation") {
        await confirmSubscription(message.SubscribeURL);
        console.log("✅ SNS subscription confirmed");
        return res.status(200).send("OK");
      }

      // STEP 2 — Handle inbound email
      if (message.Type === "Notification") {
        await processNotification(message);
        return res.status(200).send("Processed");
      }

      res.status(400).send("Unknown message type");
    } catch (err) {
      console.error("❌ Error in inbound email handler:", err);
      res.status(500).send("Server error");
    }
  }

  /**
   * Confirms SNS subscription using native fetch
   * @param {string} subscribeURL
   */
  const confirmSubscription = async (subscribeURL) => {
    const response = await fetch(subscribeURL);
    if (!response.ok) {
      throw new Error(`Subscription confirmation failed: ${response.status}`);
    }
  }

  /**
   * Processes a single SES → SNS notification
   * @param {object} message
   */
  const processNotification = async (message) => {
    const mailObj = JSON.parse(message.Message);
    const rawEmail = Buffer.from(mailObj.content, "base64");
    const parsed = await simpleParser(rawEmail);

    const from = parsed.from?.text || "Unknown sender";
    const subject = parsed.subject || "(no subject)";
    const body = parsed.text?.trim() || "";

    console.log(`📩 Inbound email from: ${from}`);
    console.log(`Subject: ${subject}`);


    const match = subject.match(/\[CELESTE-(\w+)\]/);
    if (!match) {
      console.warn("⚠️ No ticket number found in subject.");
      return;
    }

    const ticketNumber = match[1];

    const ticket = await findTicketByPartialId(ticketNumber);
    if (!ticket) {
      console.warn(`⚠️ Ticket #${ticketNumber} not found in DB.`);
      return;
    }

    const user = await findUserByEmail(from);
    if (!user) {
      console.warn(`⚠️ User ${from} not found in DB.`);
    }

    // Construire le nom de l'expéditeur
    const senderName = user 
      ? `${user.name} ${user.lastName}`.trim()
      : from;

    // Update corresponding ticket in DB
    const result = await Ticket.findByIdAndUpdate(
      ticket._id,
      {
        $push: {
          replies: {
            content: body,
            senderEmail: from,
            senderName: senderName,
            isFromAdmin: false,
            createdAt: new Date()
          },
        },
      },
      { new: true }
    );

    if (!result) {
      console.warn(`⚠️ Failed to update ticket #${ticketNumber}`);
    } else {
      console.log(`✅ Message appended to ticket #${ticketNumber}`);
    }
  }


export { 
  handleInboundEmail, 
  confirmSubscription, 
  processNotification,
  findTicketByPartialId,
  findUserByEmail
};
