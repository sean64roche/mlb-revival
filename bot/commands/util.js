import { ButtonBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { currentSeason } from '../globals.js';

export async function baseHandler(interaction, dataCollector, verifier, onConfirm, ephemeral, deferred) {
    if (deferred) {
        await interaction.deferReply({ ephemeral: ephemeral });
    }

    const data = await dataCollector(interaction);

    if (sendFailure(interaction, data.failure, deferred)) return;

    const [failures, prompts, confirmLabel, confirmMessage, cancelMessage] = verifier(data);

    if (sendFailure(interaction, failures, deferred)) return;

    if (await confirmAction(interaction, confirmLabel, prompts, confirmMessage, cancelMessage, ephemeral, deferred)) {
        await onConfirm(data);
    }
}

export async function baseFunctionlessHandler(interaction, dataCollector, verifier, responseWriter, ephemeral, deferred) {
    if (deferred) {
        await interaction.deferReply({ ephemeral: ephemeral });
    }

    const data = await dataCollector(interaction);

    if (sendFailure(interaction, data.failure, deferred)) return;

    const failures = verifier(data);

    if (sendFailure(interaction, failures, deferred)) return;

    const response = responseWriter(data);

    if (deferred) {
        await interaction.editReply(response);
    }
    else {
        await interaction.reply({ content: response, ephemeral: ephemeral });
    }
}

export async function confirmAction(interaction, confirmLabel, prompts, confirmMessage, cancelMessage, ephemeral, deferred) {
    if (!prompts || prompts.length === 0) {
        if (deferred) {
            await interaction.editReply(confirmMessage);
        }
        else {
            await interaction.reply({ content: confirmMessage, ephemeral: ephemeral });
        }
        return true;
    }

    const prompt = prompts.join('\n');
    const cancelButton = new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
    const confirmButton = new ButtonBuilder().setCustomId('confirm').setLabel(confirmLabel).setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(cancelButton).addComponents(confirmButton);

    const response = deferred
        ? await interaction.editReply({ content: prompt, components: [row] })
        : await interaction.reply({ content: prompt, components: [row], ephemeral: ephemeral });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });

        if (confirmation.customId === 'confirm') {
            await confirmation.update({ content: confirmMessage, components: [] });
            return true;
        }
        else {
            await confirmation.update({ content: `Action canceled: ${cancelMessage}`, components: [] });
        }
    } catch (e) {
        await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
    }

    return false;
}

export function sendFailure(interaction, failures, deferred) {
    if (failures?.constructor === Array) {
        failures = failures.join('\n');
    }

    if (failures) {
        if (deferred) {
            interaction.editReply({ content: `Action FAILED:\n${failures}` });
        }
        else {
            interaction.reply({ content: `Action FAILED:\n${failures}`, ephemeral: true });
        }
        return true;
    }

    return false;
}

export function addModOverrideableFailure(userIsMod, failures, prompts, message) {
    if (userIsMod) {
        prompts.push(message);
    }
    else {
        failures.push(message);
    }
}

export function rightAlign(space, value) {
    return `${value} `.padStart(space, ' ');
}

export function fixFloat(float) {
    return +float.toFixed(2);
}

export function userIsOwner(user) {
    return user.permissions.has(PermissionFlagsBits.ManageGuild);
}

export function userIsMod(user) {
    return user.permissions.has(PermissionFlagsBits.ManageChannels);
}

export function userIsCaptain(user) {
    return user.roles.cache.has(process.env.captainRoleId);
}

export function userIsCoach(user) {
    return user.roles.cache.has(process.env.captainRoleId);
}

export function weekName(week) {
    if (week <= currentSeason.regular_weeks) {
        return `Week ${week}`;
    }

    const totalWeeks = currentSeason.regular_weeks + Math.ceil(Math.log2(currentSeason.playoff_size));
    switch (week) {
        case totalWeeks: return 'Finals';
        case totalWeeks - 1: return 'Semifinals';
        case totalWeeks - 2: return 'Quarterfinals';
        default: return 'go yell at jumpy to fix this';
    }
}