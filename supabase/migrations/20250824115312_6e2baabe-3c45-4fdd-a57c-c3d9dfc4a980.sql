-- Trigger para executar a função quando uma proposta for atualizada
CREATE TRIGGER on_proposal_status_change
    AFTER UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION handle_proposal_acceptance();