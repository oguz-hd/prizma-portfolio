import { useState } from 'react'

import { ApiError, api, setToken } from '../api'
import { Form, TextInput } from '../fields'
import { useAction, useDirty } from '../panel'
import { Page } from './Page'

export function AccountPage({ email }: { email: string | null }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [status, run] = useAction()
  useDirty(current !== '' || next !== '' || repeat !== '')

  const save = () =>
    run(async () => {
      if (next !== repeat) throw new ApiError(0, ['Yeni parola ile tekrarı aynı değil.'])
      // Sunucu eski token'ların hepsini geçersiz kılıyor — bu sekme yenisiyle sürer.
      const { accessToken } = await api.changePassword(current, next)
      setToken(accessToken)
      setCurrent('')
      setNext('')
      setRepeat('')
    })

  return (
    <Page title="Hesap" lead={email ? `${email} olarak giriş yapıldı.` : undefined}>
      <Form
        dirty={current !== '' && next !== ''}
        status={status}
        onSave={save}
        submitLabel="Parolayı değiştir"
        done="Parola değişti. Açık olan öteki oturumlar kapandı."
      >
        <TextInput
          label="Mevcut parola"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
        />
        <TextInput
          label="Yeni parola"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          hint="En az 10 karakter. Değişince açık olan bütün oturumlar kapanır — bu sekme hariç."
        />
        <TextInput
          label="Yeni parola (tekrar)"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={setRepeat}
          warning={repeat !== '' && next !== repeat ? 'Parolalar aynı değil.' : null}
        />
      </Form>
    </Page>
  )
}
