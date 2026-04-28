// Served at /setup/app.js
// No fancy syntax: keep it maximally compatible.

(function () {
  var statusEl = document.getElementById('status');
  var statusDetailsEl = document.getElementById('statusDetails');
  var statusPillEl = document.getElementById('statusPill');
  var authGroupEl = document.getElementById('authGroup');
  var authChoiceEl = document.getElementById('authChoice');
  var authSecretEl = document.getElementById('authSecret');
  var logEl = document.getElementById('log');
  var runBtnEl = document.getElementById('run');
  var runSummaryEl = document.getElementById('runSummary');
  var runResultCardEl = document.getElementById('runResultCard');
  var runResultTitleEl = document.getElementById('runResultTitle');
  var runResultBodyEl = document.getElementById('runResultBody');
  var runActionsEl = document.getElementById('runActions');
  var openUiActionEl = document.getElementById('openUiAction');
  var showLogsBtnEl = document.getElementById('showLogsBtn');
  var logWrapEl = document.getElementById('logWrap');
  var authChoiceHelpEl = document.getElementById('authChoiceHelp');
  var authChoiceModeEl = document.getElementById('authChoiceMode');

  // Tabs
  var tabButtons = document.querySelectorAll('[data-tab-target]');
  var tabPanels = document.querySelectorAll('[data-tab-panel]');

  // Pairing
  var pairingChannelEl = document.getElementById('pairingChannel');
  var pairingCodeEl = document.getElementById('pairingCode');
  var pairingRunEl = document.getElementById('pairingApprove');
  var pairingOutEl = document.getElementById('pairingOut');

  // Debug console
  var consoleCmdEl = document.getElementById('consoleCmd');
  var consoleArgEl = document.getElementById('consoleArg');
  var consoleRunEl = document.getElementById('consoleRun');
  var consoleOutEl = document.getElementById('consoleOut');

  // Config editor
  var configPathEl = document.getElementById('configPath');
  var configTextEl = document.getElementById('configText');
  var configReloadEl = document.getElementById('configReload');
  var configSaveEl = document.getElementById('configSave');
  var configOutEl = document.getElementById('configOut');

  // Import
  var importFileEl = document.getElementById('importFile');
  var importRunEl = document.getElementById('importRun');
  var importOutEl = document.getElementById('importOut');

  // Devices
  var devicesRefreshBtn = document.getElementById('devicesRefresh');
  var devicesListEl = document.getElementById('devicesList');

  // Reset
  var resetEl = document.getElementById('reset');

  var configLoaded = false;
  var channelsHelpWarned = false;

  var AUTH_SECRET_CHOICES = {
    'openai-api-key': true,
    'apiKey': true,
    'openrouter-api-key': true,
    'ai-gateway-api-key': true,
    'moonshot-api-key': true,
    'kimi-code-api-key': true,
    'gemini-api-key': true,
    'zai-api-key': true,
    'minimax-api': true,
    'minimax-api-lightning': true,
    'synthetic-api-key': true,
    'opencode-zen': true,
    'token': true
  };

  function setStatusText(s) {
    if (statusEl) statusEl.textContent = s;
  }

  function setStatusPill(label, tone) {
    if (!statusPillEl) return;
    statusPillEl.textContent = label;
    statusPillEl.className = 'pill' + (tone ? ' pill-' + tone : '');
  }

  function setRunBusy(busy) {
    if (!runBtnEl) return;
    runBtnEl.disabled = !!busy;
    runBtnEl.textContent = busy ? 'Running setup...' : 'Run setup';
  }

  function showRunResult(title, body, tone) {
    if (runResultCardEl) runResultCardEl.hidden = false;
    if (runResultCardEl) runResultCardEl.className = 'card result-card result-' + (tone || 'neutral');
    if (runResultTitleEl) runResultTitleEl.textContent = title;
    if (runResultBodyEl) runResultBodyEl.textContent = body;
  }

  function hideRunResult() {
    if (runResultCardEl) runResultCardEl.hidden = true;
  }

  function setLogsVisible(visible) {
    if (!logWrapEl) return;
    logWrapEl.hidden = !visible;
    if (showLogsBtnEl) showLogsBtnEl.textContent = visible ? 'Hide technical log' : 'Show technical log';
  }

  function isInteractiveOAuth(optionValue, optionLabel) {
    var v = String(optionValue || '');
    var l = String(optionLabel || '');
    return l.indexOf('OAuth') !== -1 || v.indexOf('cli') !== -1 || v.indexOf('codex') !== -1 || v.indexOf('portal') !== -1;
  }

  function currentAuthChoiceMeta() {
    var currentGroup = authGroupEl && authGroupEl._currentGroup;
    var opts = currentGroup && currentGroup.options ? currentGroup.options : [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === authChoiceEl.value) return opts[i];
    }
    return null;
  }

  function updateAuthChoiceHelp() {
    var meta = currentAuthChoiceMeta();
    if (!meta) {
      if (authChoiceHelpEl) authChoiceHelpEl.textContent = 'Pick an auth method to see what it needs.';
      if (authChoiceModeEl) authChoiceModeEl.textContent = 'Choose an auth method';
      return;
    }

    var interactive = isInteractiveOAuth(meta.value, meta.label);
    if (authChoiceModeEl) authChoiceModeEl.textContent = interactive ? 'Interactive OAuth / device flow' : 'Paste secret now';

    if (!authChoiceHelpEl) return;
    if (AUTH_SECRET_CHOICES[meta.value]) {
      authChoiceHelpEl.textContent = 'This method needs a secret pasted into the field below.';
    } else if (interactive) {
      authChoiceHelpEl.textContent = 'This method usually opens a browser or device flow. Use it only if you want an interactive login.';
    } else {
      authChoiceHelpEl.textContent = 'This method does not need a pasted secret.';
    }
  }

  function renderAuth(groups) {
    authGroupEl.innerHTML = '';

    var advancedToggle = document.getElementById('showAdvancedAuth');
    if (!advancedToggle) {
      return;
    }

    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label + (g.hint ? ' - ' + g.hint : '');
      authGroupEl.appendChild(opt);
    }

    function rerenderChoices() {
      var sel = null;
      for (var j = 0; j < groups.length; j++) {
        if (groups[j].value === authGroupEl.value) sel = groups[j];
      }
      authGroupEl._currentGroup = sel;
      authChoiceEl.innerHTML = '';
      var opts = (sel && sel.options) ? sel.options : [];
      var showAdv = Boolean(advancedToggle && advancedToggle.checked);
      var firstVisible = null;
      var firstNonInteractive = null;

      for (var k = 0; k < opts.length; k++) {
        var o = opts[k];
        var interactive = isInteractiveOAuth(o.value, o.label);
        if (interactive && !showAdv) continue;
        if (!firstVisible) firstVisible = o.value;
        if (!interactive && !firstNonInteractive) firstNonInteractive = o.value;

        var opt2 = document.createElement('option');
        opt2.value = o.value;
        opt2.textContent = o.label;
        authChoiceEl.appendChild(opt2);
      }

      authChoiceEl.value = firstNonInteractive || firstVisible || '';
      updateAuthChoiceHelp();
      updateRunSummary();
    }

    authGroupEl.onchange = rerenderChoices;
    authChoiceEl.onchange = function () {
      updateAuthChoiceHelp();
      updateRunSummary();
    };
    advancedToggle.onchange = rerenderChoices;

    rerenderChoices();
  }

  function httpJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + ': ' + (t || res.statusText));
        });
      }
      return res.json();
    });
  }

  function updateRunSummary() {
    if (!runSummaryEl) return;
    var channels = [];
    if (document.getElementById('telegramToken').value.trim()) channels.push('Telegram');
    if (document.getElementById('discordToken').value.trim()) channels.push('Discord');
    if (document.getElementById('slackBotToken').value.trim() || document.getElementById('slackAppToken').value.trim()) channels.push('Slack');
    var groupText = authGroupEl && authGroupEl.options[authGroupEl.selectedIndex] ? authGroupEl.options[authGroupEl.selectedIndex].textContent : 'No provider selected';
    var methodText = authChoiceEl && authChoiceEl.options[authChoiceEl.selectedIndex] ? authChoiceEl.options[authChoiceEl.selectedIndex].textContent : 'No auth method selected';
    var flowText = document.getElementById('flow').value || 'quickstart';
    runSummaryEl.textContent = 'Provider: ' + groupText + ' | Auth: ' + methodText + ' | Flow: ' + flowText + ' | Channels: ' + (channels.length ? channels.join(', ') : 'none yet');
  }

  function refreshStatus() {
    setStatusText('Loading...');
    setStatusPill('Checking', 'neutral');
    if (statusDetailsEl) statusDetailsEl.textContent = '';

    return httpJson('/setup/api/status').then(function (j) {
      var ver = j.openclawVersion ? (' | ' + j.openclawVersion) : '';
      setStatusText((j.configured ? 'Configured' : 'Not configured - run setup below') + ver);
      setStatusPill(j.configured ? 'Configured' : 'Needs setup', j.configured ? 'success' : 'warning');

      if (statusDetailsEl) {
        var parts = [];
        parts.push('Gateway target: ' + (j.gatewayTarget || '(unknown)'));
        parts.push(j.configured ? 'OpenClaw is configured. You can open the UI or use the advanced tools below.' : 'Start in the Setup tab, then use Pairing if a channel asks for approval.');
        statusDetailsEl.textContent = parts.join('\n');
      }

      if (!channelsHelpWarned && j.channelsAddHelp && j.channelsAddHelp.indexOf('telegram') === -1) {
        logEl.textContent += '\nNote: this OpenClaw build does not list telegram in `channels add --help`. Telegram auto-add will be skipped.\n';
        channelsHelpWarned = true;
      }

      if (j.configured && openUiActionEl) openUiActionEl.hidden = false;
    }).catch(function (e) {
      setStatusText('Error: ' + String(e));
      setStatusPill('Error', 'danger');
      if (statusDetailsEl) statusDetailsEl.textContent = '';
    });
  }

  function loadAuthGroupsFast() {
    return httpJson('/setup/api/auth-groups').then(function (j) {
      if (j && j.authGroups && j.authGroups.length > 0) {
        renderAuth(j.authGroups);
        return;
      }
      throw new Error('Missing authGroups from /setup/api/auth-groups');
    }).catch(function (e) {
      console.warn('[setup] authGroups load failed:', e);
      renderAuth([]);
    });
  }

  function buildPayload() {
    return {
      flow: document.getElementById('flow').value,
      authChoice: authChoiceEl.value,
      authSecret: authSecretEl.value,
      telegramToken: document.getElementById('telegramToken').value,
      discordToken: document.getElementById('discordToken').value,
      slackBotToken: document.getElementById('slackBotToken').value,
      slackAppToken: document.getElementById('slackAppToken').value,
      customProviderId: document.getElementById('customProviderId').value,
      customProviderBaseUrl: document.getElementById('customProviderBaseUrl').value,
      customProviderApi: document.getElementById('customProviderApi').value,
      customProviderApiKeyEnv: document.getElementById('customProviderApiKeyEnv').value,
      customProviderModelId: document.getElementById('customProviderModelId').value
    };
  }

  function validatePayload(payload) {
    if (AUTH_SECRET_CHOICES[payload.authChoice] && !String(payload.authSecret || '').trim()) {
      return 'This auth method needs a pasted secret before setup can run.';
    }
    return '';
  }

  function runSetup() {
    var payload = buildPayload();
    var validationError = validatePayload(payload);
    hideRunResult();
    setLogsVisible(false);
    if (runActionsEl) runActionsEl.hidden = true;

    if (validationError) {
      showRunResult('Missing required input', validationError, 'danger');
      return;
    }

    updateRunSummary();
    setRunBusy(true);
    logEl.textContent = 'Running...\n';
    showRunResult('Running setup', 'OpenClaw is applying your provider and channel choices now.', 'neutral');

    fetch('/setup/api/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.text();
    }).then(function (text) {
      var j;
      try { j = JSON.parse(text); } catch (_e) { j = { ok: false, output: text }; }
      logEl.textContent = j.output || JSON.stringify(j, null, 2);

      if (j.ok) {
        showRunResult('Setup complete', 'OpenClaw finished onboarding. You can open the UI now, or use Pairing if a channel still needs approval.', 'success');
      } else {
        showRunResult('Setup needs attention', 'Setup did not finish cleanly. Check the technical log for the exact command output.', 'danger');
      }

      if (runActionsEl) runActionsEl.hidden = false;
      return refreshStatus();
    }).catch(function (e) {
      logEl.textContent += '\nError: ' + String(e) + '\n';
      showRunResult('Setup failed', 'The setup request failed before OpenClaw could finish. Check the technical log below.', 'danger');
      if (runActionsEl) runActionsEl.hidden = false;
    }).finally(function () {
      setRunBusy(false);
    });
  }

  function runConsole() {
    if (!consoleCmdEl || !consoleRunEl) return;
    var cmd = consoleCmdEl.value;
    var arg = consoleArgEl ? consoleArgEl.value : '';
    if (consoleOutEl) consoleOutEl.textContent = 'Running ' + cmd + '...\n';

    return httpJson('/setup/api/console/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cmd: cmd, arg: arg })
    }).then(function (j) {
      if (consoleOutEl) consoleOutEl.textContent = (j.output || JSON.stringify(j, null, 2));
      return refreshStatus();
    }).catch(function (e) {
      if (consoleOutEl) consoleOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  function loadConfigRaw() {
    if (!configTextEl) return;
    if (configOutEl) configOutEl.textContent = '';
    return httpJson('/setup/api/config/raw').then(function (j) {
      if (configPathEl) {
        configPathEl.textContent = 'Config file: ' + (j.path || '(unknown)') + (j.exists ? '' : ' (does not exist yet)');
      }
      configTextEl.value = j.content || '';
      configLoaded = true;
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent = 'Error loading config: ' + String(e);
    });
  }

  function saveConfigRaw() {
    if (!configTextEl) return;
    if (!confirm('Save config and restart gateway? A timestamped .bak backup will be created.')) return;
    if (configOutEl) configOutEl.textContent = 'Saving...\n';
    return httpJson('/setup/api/config/raw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: configTextEl.value })
    }).then(function (j) {
      if (configOutEl) configOutEl.textContent = 'Saved: ' + (j.path || '') + '\nGateway restarted.\n';
      return refreshStatus();
    }).catch(function (e) {
      if (configOutEl) configOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  function runImport() {
    if (!importRunEl || !importFileEl) return;
    var f = importFileEl.files && importFileEl.files[0];
    if (!f) {
      alert('Pick a .tar.gz file first');
      return;
    }
    if (!confirm('Import backup? This overwrites files under /data and restarts the gateway.')) return;

    if (importOutEl) importOutEl.textContent = 'Uploading ' + f.name + ' (' + f.size + ' bytes)...\n';

    return f.arrayBuffer().then(function (buf) {
      return fetch('/setup/import', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/gzip' },
        body: buf
      });
    }).then(function (res) {
      return res.text().then(function (t) {
        if (importOutEl) importOutEl.textContent += t + '\n';
        if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + t);
        return refreshStatus();
      });
    }).catch(function (e) {
      if (importOutEl) importOutEl.textContent += '\nError: ' + String(e) + '\n';
    });
  }

  function runPairingApprove() {
    var channel = pairingChannelEl ? pairingChannelEl.value : '';
    var code = pairingCodeEl ? pairingCodeEl.value.trim() : '';
    if (!channel || !code) {
      if (pairingOutEl) pairingOutEl.textContent = 'Pick a channel and enter the pairing code first.';
      return;
    }
    if (pairingOutEl) pairingOutEl.textContent = 'Approving pairing for ' + channel + '...\n';

    fetch('/setup/api/pairing/approve', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: channel, code: code })
    }).then(function (r) {
      return r.text().then(function (t) {
        if (pairingOutEl) pairingOutEl.textContent = t;
        return refreshStatus();
      });
    }).catch(function (e) {
      if (pairingOutEl) pairingOutEl.textContent = 'Error: ' + String(e);
    });
  }

  function approveDevice(requestId) {
    if (!requestId) return;
    if (!confirm('Approve device request ' + requestId + '?')) return;
    if (devicesListEl) devicesListEl.textContent = 'Approving ' + requestId + '...';

    return httpJson('/setup/api/devices/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId: requestId })
    }).then(function (j) {
      if (devicesListEl) devicesListEl.textContent = j.output || 'Approved.';
      return refreshStatus();
    }).catch(function (e) {
      if (devicesListEl) devicesListEl.textContent = 'Error: ' + String(e);
    });
  }

  function refreshDevices() {
    if (!devicesListEl) return;
    devicesListEl.textContent = 'Loading pending devices...';
    return httpJson('/setup/api/devices/pending').then(function (j) {
      var ids = j.requestIds || [];
      if (!ids.length) {
        devicesListEl.textContent = 'No pending device requests found.';
        return;
      }
      devicesListEl.innerHTML = '';
      for (var i = 0; i < ids.length; i++) {
        (function (id) {
          var row = document.createElement('div');
          row.className = 'device-row';
          var meta = document.createElement('code');
          meta.textContent = id;
          var btn = document.createElement('button');
          btn.textContent = 'Approve';
          btn.className = 'secondary-btn';
          btn.onclick = function () { approveDevice(id); };
          row.appendChild(meta);
          row.appendChild(btn);
          devicesListEl.appendChild(row);
        })(ids[i]);
      }
    }).catch(function (e) {
      devicesListEl.textContent = 'Error: ' + String(e);
    });
  }

  function runReset() {
    if (!confirm('Reset setup? This deletes the config file so onboarding can run again.')) return;
    if (logEl) logEl.textContent = 'Resetting...\n';
    fetch('/setup/api/reset', { method: 'POST', credentials: 'same-origin' })
      .then(function (res) { return res.text(); })
      .then(function (t) {
        if (logEl) logEl.textContent += t + '\n';
        showRunResult('Setup reset', 'The config was removed. You can now run onboarding again from the Setup tab.', 'warning');
        if (runActionsEl) runActionsEl.hidden = false;
        return refreshStatus();
      })
      .catch(function (e) {
        if (logEl) logEl.textContent += 'Error: ' + String(e) + '\n';
      });
  }

  function activateTab(name) {
    for (var i = 0; i < tabButtons.length; i++) {
      var btn = tabButtons[i];
      var active = btn.getAttribute('data-tab-target') === name;
      btn.className = active ? 'tab-btn tab-active' : 'tab-btn';
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    for (var j = 0; j < tabPanels.length; j++) {
      var panel = tabPanels[j];
      panel.hidden = panel.getAttribute('data-tab-panel') !== name;
    }

    if (name === 'advanced' && !configLoaded) {
      loadConfigRaw();
    }
  }

  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].onclick = function () {
      activateTab(this.getAttribute('data-tab-target'));
    };
  }

  if (showLogsBtnEl) {
    showLogsBtnEl.onclick = function () {
      setLogsVisible(logWrapEl && logWrapEl.hidden);
    };
  }

  if (runBtnEl) runBtnEl.onclick = runSetup;
  if (pairingRunEl) pairingRunEl.onclick = runPairingApprove;
  if (consoleRunEl) consoleRunEl.onclick = runConsole;
  if (configReloadEl) configReloadEl.onclick = loadConfigRaw;
  if (configSaveEl) configSaveEl.onclick = saveConfigRaw;
  if (importRunEl) importRunEl.onclick = runImport;
  if (devicesRefreshBtn) devicesRefreshBtn.onclick = refreshDevices;
  if (resetEl) resetEl.onclick = runReset;

  var summaryInputs = [
    authGroupEl,
    authChoiceEl,
    authSecretEl,
    document.getElementById('flow'),
    document.getElementById('telegramToken'),
    document.getElementById('discordToken'),
    document.getElementById('slackBotToken'),
    document.getElementById('slackAppToken')
  ];
  for (var s = 0; s < summaryInputs.length; s++) {
    if (summaryInputs[s]) summaryInputs[s].oninput = updateRunSummary;
    if (summaryInputs[s]) summaryInputs[s].onchange = updateRunSummary;
  }

  activateTab('setup');
  hideRunResult();
  setLogsVisible(false);
  if (runActionsEl) runActionsEl.hidden = true;

  loadAuthGroupsFast().then(function () {
    updateAuthChoiceHelp();
    updateRunSummary();
  });
  refreshStatus();
})();
