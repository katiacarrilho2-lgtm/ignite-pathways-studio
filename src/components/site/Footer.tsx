import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import logo from "@/assets/multplick-logo.png";

export const Footer = () => (
  <footer className="bg-primary text-primary-foreground mt-24">
    <div className="container py-16 grid gap-10 md:grid-cols-4">
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4 inline-block shadow-elegant">
          <img src={logo} alt="Multplick" className="h-14 w-auto" />
        </div>
        <p className="text-sm text-primary-foreground/80 max-w-xs">
          Formação profissional com soluções reais para empresas e alunos.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Navegação</h4>
        <ul className="space-y-2 text-sm text-primary-foreground/80">
          <li><Link to="/sobre" className="hover:text-primary-foreground">Sobre</Link></li>
          <li><Link to="/cursos" className="hover:text-primary-foreground">Cursos</Link></li>
          <li><Link to="/empresas" className="hover:text-primary-foreground">Empresas</Link></li>
          <li><Link to="/in-company" className="hover:text-primary-foreground">In Company</Link></li>
          <li><Link to="/licenciado" className="hover:text-primary-foreground">Seja Licenciado</Link></li>
          <li><Link to="/blog" className="hover:text-primary-foreground">Blog</Link></li>
          <li>
            <a
              href="https://sistec.mec.gov.br/validadenacional"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary-foreground"
            >
              <ShieldCheck className="size-3.5" /> Validar registro no SISTEC
            </a>
          </li>
          <li><Link to="/auth" className="hover:text-primary-foreground opacity-60">Acesso restrito</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Contato</h4>
        <ul className="space-y-3 text-sm text-primary-foreground/80">
          <li className="flex items-center gap-2"><Phone className="size-4" /> (18) 99684-1902</li>
          <li className="flex items-center gap-2"><Mail className="size-4" /> contato@multplick.com.br</li>
          <li className="flex items-center gap-2"><MapPin className="size-4" /> Brasil — atendimento nacional</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Redes sociais</h4>
        <div className="flex gap-3">
          <a href="#" className="size-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-smooth"><Instagram className="size-5" /></a>
          <a href="#" className="size-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-smooth"><Facebook className="size-5" /></a>
          <a href="#" className="size-10 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center transition-smooth"><Linkedin className="size-5" /></a>
        </div>
      </div>
    </div>
    <div className="border-t border-primary-foreground/10">
      <div className="container py-6 text-sm text-primary-foreground/70 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} Multplick Formação Profissional. Todos os direitos reservados.</span>
        <span>CNPJ 37.541.371/0001-90</span>
      </div>
    </div>
  </footer>
);