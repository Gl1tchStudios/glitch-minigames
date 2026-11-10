-- Glitch Minigames - resource stop cleanup
--
-- Loaded last. If the resource stops while a game runs (restart, crash), give
-- the player back: delete the drill props, stop the circuit breaker sounds,
-- unfreeze the ped, drop NUI focus and hide the controls HUD.

AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end

    if Drilling and Drilling.StopNow then pcall(Drilling.StopNow) end
    if PlasmaDrilling and PlasmaDrilling.StopNow then pcall(PlasmaDrilling.StopNow) end
    -- immediate: the circuit loop never runs again, so stop its looping sounds here
    if CircuitBreaker and CircuitBreaker.StopNow then pcall(CircuitBreaker.StopNow, true) end

    if Minigames.busy then
        FreezeEntityPosition(PlayerPedId(), false)
        EnableAllControlActions(0)
    end
    SetNuiFocus(false, false)
    if HideControls then pcall(HideControls) end
end)
