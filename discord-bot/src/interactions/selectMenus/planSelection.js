import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import db from '../../services/database.js';
import reviewService from '../../services/reviewService.js';
import { logger } from '../../utils/logger.js';

const PAYMENT_METHODS = {
  VODAFONE: { name: 'Vodafone Cash', wallet: '01XXXXXXXXX', receiver: 'Receiver Name' },
  ORANGE: { name: 'Orange Cash', wallet: '01XXXXXXXXX', receiver: 'Receiver Name' },
  ETISALAT: { name: 'Etisalat Cash', wallet: '01XXXXXXXXX', receiver: 'Receiver Name' },
  WE: { name: 'WE Cash', wallet: '01XXXXXXXXX', receiver: 'Receiver Name' },
  INSTAPAY: { name: 'Instapay', account: '01XXXXXXXXX', receiver: 'Receiver Name' }
};

export async function handlePlanSelection(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const planId = interaction.values[0].split('_')[1];
    const plan = db.getPlanById(planId);

    if (!plan) {
      return interaction.editReply({ content: '❌ Plan not found' });
    }

    // Get or create user
    let user = db.getUserByDiscordId(interaction.user.id);
    if (!user) {
      const userId = db.createUser(interaction.user.id, interaction.user.username);
      user = { id: userId, discord_id: interaction.user.id };
    }

    // Create private order channel
    const channelName = `order-${interaction.user.id.substring(0, 8)}-${Date.now().toString().slice(-6)}`;
    const orderChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
        },
        {
          id: process.env.DISCORD_CLIENT_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
        }
      ]
    });

    // Create order in database
    const { id: orderId, orderId: orderIdStr } = db.createOrder(
      user.id,
      plan.duration_days,
      plan.traffic_gb,
      plan.price_egp,
      null,
      orderChannel.id
    );

    // Send welcome message to order channel
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Your Order')
      .addFields(
        { name: 'Order ID', value: orderIdStr, inline: true },
        { name: 'Plan', value: plan.name, inline: true },
        { name: 'Duration', value: `${plan.duration_days} days`, inline: true },
        { name: 'Traffic', value: `${plan.traffic_gb}GB`, inline: true },
        { name: 'Price', value: `${plan.price_egp} EGP`, inline: true },
        { name: 'Status', value: 'Pending Payment', inline: true }
      )
      .setDescription('Select your payment method below')
      .setTimestamp();

    // Create payment method buttons
    const paymentRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`payment_VODAFONE_${orderId}`)
          .setLabel('📱 Vodafone Cash')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`payment_ORANGE_${orderId}`)
          .setLabel('🟠 Orange Cash')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`payment_ETISALAT_${orderId}`)
          .setLabel('🔴 Etisalat Cash')
          .setStyle(ButtonStyle.Secondary)
      );

    const paymentRow2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`payment_WE_${orderId}`)
          .setLabel('💜 WE Cash')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`payment_INSTAPAY_${orderId}`)
          .setLabel('🏦 Instapay')
          .setStyle(ButtonStyle.Secondary)
      );

    await orderChannel.send({ embeds: [welcomeEmbed], components: [paymentRow, paymentRow2] });

    // Send confirmation to user
    const confirmEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('✅ Order Created')
      .setDescription(`Your order channel has been created: ${orderChannel}`)
      .addFields({ name: 'Order ID', value: orderIdStr })
      .setTimestamp();

    await interaction.editReply({ embeds: [confirmEmbed] });
    logger.info('Order created', { orderId, userId: user.id, planId });
  } catch (error) {
    logger.error('Error in plan selection handler', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}

export async function handlePaymentMethodSelection(interaction) {
  try {
    await interaction.deferUpdate();

    const [, paymentMethod, orderId] = interaction.customId.split('_');
    const order = db.getOrderById(orderId);

    if (!order) {
      return interaction.followUp({ content: '❌ Order not found', ephemeral: true });
    }

    // Update order with payment method
    db.updateOrderPaymentMethod(orderId, paymentMethod);
    db.updateOrderStatus(orderId, 'WAITING_PAYMENT');

    const paymentInfo = PAYMENT_METHODS[paymentMethod];

    const embed = new EmbedBuilder()
      .setColor('#ffaa00')
      .setTitle('💳 Payment Instructions')
      .addFields(
        { name: 'Payment Method', value: paymentInfo.name, inline: false },
        { name: 'Wallet/Account', value: paymentInfo.wallet || paymentInfo.account, inline: false },
        { name: 'Receiver Name', value: paymentInfo.receiver, inline: false },
        { name: 'Amount', value: `${order.price_egp} EGP`, inline: false },
        { name: 'Order ID', value: order.order_id, inline: false },
        { name: 'Instructions', value: '1. Send the exact amount to the wallet above\n2. Upload a screenshot of the payment\n3. Wait for admin review', inline: false }
      )
      .setDescription('⏰ You have 24 hours to complete the payment')
      .setTimestamp();

    await interaction.message.edit({ embeds: [embed], components: [] });

    const instructionEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📸 Next Step')
      .setDescription('Please upload a screenshot of your payment in this channel')
      .setTimestamp();

    await interaction.channel.send({ embeds: [instructionEmbed] });

    logger.info('Payment method selected', { orderId, paymentMethod });
  } catch (error) {
    logger.error('Error in payment method handler', { message: error.message });
    await interaction.followUp({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}
