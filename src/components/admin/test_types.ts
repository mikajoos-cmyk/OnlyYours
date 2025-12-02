
import { supabase } from '../../lib/supabase';

async function test() {
    const { error } = await supabase
        .from('posts')
        .update({ caption: 'test' })
        .eq('id', 'some-id');
}
