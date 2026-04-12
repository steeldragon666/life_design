-- Atomic session stats increment to avoid read-modify-write races.
-- Called from /api/companion/chat after each message exchange.

CREATE OR REPLACE FUNCTION increment_companion_session_stats(
  p_session_id uuid,
  p_message_count_delta integer,
  p_input_tokens_delta integer,
  p_output_tokens_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE companion_sessions
  SET
    message_count = message_count + p_message_count_delta,
    input_tokens = input_tokens + p_input_tokens_delta,
    output_tokens = output_tokens + p_output_tokens_delta
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'companion_session not found: %', p_session_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users (RLS on the underlying table
-- still enforces row-level access via the UPDATE policy).
GRANT EXECUTE ON FUNCTION increment_companion_session_stats(uuid, integer, integer, integer)
  TO authenticated;
