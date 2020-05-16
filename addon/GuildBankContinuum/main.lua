GuildBankContinuum = LibStub("AceAddon-3.0"):NewAddon("GuildBankContinuum", "AceConsole-3.0", "AceEvent-3.0")

local enabled = false      -- Addon Enabled for this toon

local transactions = {}    -- Transactions tracked by incoming/outgoing mail
local bags = {}            -- Items in bags
local bank = nil           -- Items in bank
local bankEventNum = 0;

local currentSendMail = {} -- Temporary variable for current outgoing mail being edited


function GuildBankContinuum:OnInitialize()

  if (GuildBankContinuumCharacterDB == nil) then
    GuildBankContinuumCharacterDB = {
      enabled = false;
    }
  end

  enabled = GuildBankContinuumCharacterDB.enabled
  
  GuildBankContinuum:RegisterChatCommand('gbc', 'HandleChatCommand')

  GuildBankContinuum:RegisterEvent('MAIL_SHOW')
  GuildBankContinuum:RegisterEvent('MAIL_CLOSED')
  GuildBankContinuum:RegisterEvent('MAIL_SEND_SUCCESS')
  GuildBankContinuum:RegisterEvent('SEND_MAIL_MONEY_CHANGED')
  GuildBankContinuum:RegisterEvent('MAIL_SEND_INFO_UPDATE')
  GuildBankContinuum:RegisterEvent('BANKFRAME_CLOSED')
  SendMailNameEditBox:SetScript("OnTextChanged", updateSendMailInfo)
end

function GuildBankContinuum:HandleChatCommand(input)
  local args = {}
  for s in string.gmatch(input, "%S+") do
    args[#args+1] = s
  end

  local playerName, _ = UnitName('player')

  if args[1] == 'enable' then
    enabled = true
    GuildBankContinuumCharacterDB.enabled = true
    GuildBankContinuum:Print('Addon enabled for ' .. playerName)
    return
  end

  if args[1] == 'disable' then
    enabled = false
    GuildBankContinuumCharacterDB.enabled = false
    GuildBankContinuum:Print('Addon disabled for ' .. playerName)
    return
  end

  if args[1] == 'show' then
    GuildBankContinuum:DisplayExportString(GuildBankContinuum:CreateExportString())
    return
  end

  GuildBankContinuum:Print('Guild Bank Continuum Help:')
  GuildBankContinuum:Print('enable  -- Enables addon for this character')
  GuildBankContinuum:Print('disable -- Disables addon for this character')
  GuildBankContinuum:Print('show    -- Shows export string')

end

function GuildBankContinuum:MAIL_SHOW()
  GuildBankContinuum:resetSendMailInfo()
  if enabled then
    GuildBankContinuum:readMail()
  end
end

function GuildBankContinuum:MAIL_CLOSED()
  GuildBankContinuum:resetSendMailInfo()
end

function GuildBankContinuum:MAIL_SEND_SUCCESS()
  if enabled then
    GuildBankContinuum:TrackTransaction(currentSendMail.recipient, currentSendMail.money, currentSendMail.items)
  end
  GuildBankContinuum:resetSendMailInfo()
end

function GuildBankContinuum:updateSendMailInfo()
  currentSendMail.recipient = SendMailNameEditBox:GetText();
end

function GuildBankContinuum:SEND_MAIL_MONEY_CHANGED()
  if GetSendMailMoney()~=0 then
    currentSendMail.money = -GetSendMailMoney()
  end
  GuildBankContinuum:updateSendMailInfo()
end

function GuildBankContinuum:MAIL_SEND_INFO_UPDATE()
  currentSendMail.items = {}
  for index=1, 12 do
    local itemName, itemId, _, count, _ = GetSendMailItem(index)
    if itemName then
      if currentSendMail.items[itemId] then
        currentSendMail.items[itemId] = currentSendMail.items[itemId] - count
      else
        currentSendMail.items[itemId] = -count
      end
    end
  end
  GuildBankContinuum:updateSendMailInfo()
end

function GuildBankContinuum:resetSendMailInfo()
  currentSendMail = {}
  currentSendMail.recipient = nil
  currentSendMail.money = 0
  currentSendMail.items = {}
end

function GuildBankContinuum:readMail()
  C_Timer.NewTimer(1, function()

    local numMail = GetInboxNumItems()

    if numMail > 0 then
      for mail=1, numMail do
        local _, _, sender, _, money, COD, _, _, wasRead, _, _, _, _ = GetInboxHeaderInfo(mail)
        if sender ~= "Alliance Auction House" and not wasRead then
          local attached_items = {}

          for item=1, ATTACHMENTS_MAX_RECEIVE do
            local itemName, itemId, _, count, _, _ = GetInboxItem(mail, item)
            if itemName then
              if attached_items[itemId] then
                attached_items[itemId] = attached_items[itemId] + count
              else
                attached_items[itemId] = count
              end
            end
          end

          GuildBankContinuum:TrackTransaction(sender, money - COD, attached_items)
          GetInboxText(mail) -- Marks as read
        end
      end
    end
  end)
end

function GuildBankContinuum:TrackTransaction(sender, money, items)
  local count = 0
  for _ in pairs(items) do count = count + 1 end
  if count ~= 0 or money ~= 0 then
    local index = #transactions + 1

    transactions[index] = {
      sender = sender,
      money = money,
      items = items
    }
  end
end

function GuildBankContinuum:DisplayExportString(exportString)
  GbcFrame:Show()
  GbcFrameScroll:Show()
  GbcFrameScrollText:Show()
  GbcFrameScrollText:SetText(exportString)
  GbcFrameScrollText:HighlightText()
  GbcFrameButton:SetScript('OnClick', function(self)
    GbcFrame:Hide()
    end
  );
end

function GuildBankContinuum:CreateExportString()
  GuildBankContinuum:GetBags()
  local money = GetMoney()
  local characterName = GetUnitName('player')

  local exportString = '{"transactions":['

  local enteredOuterLoop = false
  for _, transaction in ipairs(transactions) do
    enteredOuterLoop = true

    exportString = exportString .. '{"sender":"' .. transaction.sender .. '",'
    exportString = exportString .. '"money":' .. transaction.money .. ','
    exportString = exportString .. '"items":{'

    local enteredInnerLoop = false
    for itemID, quantity in pairs(transaction.items) do
      enteredInnerLoop = true
      exportString = exportString .. '"' .. itemID .. '":' .. quantity .. ','
    end

    if enteredInnerLoop then
      exportString = exportString:sub(1, #exportString - 1)  -- Remove trailing comma
    end

    exportString = exportString .. '}},'
  end

  if enteredOuterLoop then
    exportString = exportString:sub(1, #exportString - 1)  -- Remove trailing comma
  end

  exportString = exportString .. '],"bags":{'

  local enteredLoop = false
  for itemID, quantity in pairs(bags) do
    enteredLoop = true
    exportString = exportString .. '"' .. itemID .. '":' .. quantity .. ','
  end

  if enteredLoop then
    exportString = exportString:sub(1, #exportString - 1)  -- Remove trailing comma
  end

  exportString = exportString .. '},"bank":'

  if bank == nil then
    exportString = exportString .. 'null'
  else
    exportString = exportString .. '{'
    enteredLoop = false
    for itemID, quantity in pairs(bank) do
      enteredLoop = true
      exportString = exportString .. '"' .. itemID .. '":' .. quantity .. ','
    end

    if enteredLoop then
      exportString = exportString:sub(1, #exportString - 1)  -- Remove trailing comma
    end
   exportString = exportString .. '}'
  end

  exportString = exportString .. ',"money":' .. money
  exportString = exportString .. ',"character":"' .. characterName .. '"}'

  return exportString
end

function GuildBankContinuum:GetBags()
  bags = {}

  for container = 0, NUM_BAG_SLOTS do
    for slot = 1, GetContainerNumSlots(container) do
      local _, count, _, _, _, _, _, _, _, itemId = GetContainerItemInfo(container, slot)

      if count then -- Slot actually holds something
        if bags[itemId] then
          bags[itemId] = bags[itemId] + count
        else
          bags[itemId] = count
        end
      end
    end
  end
end

function GuildBankContinuum:BANKFRAME_CLOSED()
  GuildBankContinuum:GetBank()
end

function GuildBankContinuum:GetBank()
  bankEventNum = bankEventNum + 1;
  if bankEventNum == 1 then
    bank = {}
 
    local bank_slots = {}
    bank_slots[1] = BANK_CONTAINER
    for container = NUM_BAG_SLOTS + 1, NUM_BAG_SLOTS + NUM_BANKBAGSLOTS do
      bank_slots[#bank_slots + 1] = container
    end

    for _, container in ipairs(bank_slots) do
      for slot = 1, GetContainerNumSlots(container) do
        local _, count, _, _, _, _, _, _, _, itemId = GetContainerItemInfo(container, slot)

        if count then -- Slot actually holds something
          if bank[itemId] then
            bank[itemId] = bank[itemId] + count
          else
            bank[itemId] = count
          end
        end
      end
    end
  end
  C_Timer.NewTimer(.5, function()
    bankEventNum = 0
  end)
end