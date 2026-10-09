import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
/** Legacy route: site intake always starts with a person physically present. */
export const RegisterChooseTypeScreen: React.FC = () => {
  const { navigateTo, setRegistrationType } = useApp();
  useEffect(() => { setRegistrationType('found'); navigateTo('register_speak'); }, [navigateTo, setRegistrationType]);
  return <p className="p-4">Opening Register a person…</p>;
};
