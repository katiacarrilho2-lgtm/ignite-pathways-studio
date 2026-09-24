import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import defaultLogo from "@/assets/multplick-logo.png";
import { useSiteIdentity } from "./SiteTheme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/", label: "Início" },
  { to: "/sobre", label: "Sobre" },
  { to: "/cursos", label: "Cursos" },
  { to: "/loja", label: "Loja" },
  { to: "/curso-regular", label: "Técnico Regular" },
  { to: "/curso-por-competencia", label: "Técnico por Competência" },
  { to: "/empresas", label: "Empresas" },
  { to: "/in-company", label: "In Company" },
  { to: "/licenciado", label: "Seja Licenciado" },
  { to: "/blog", label: "Blog" },
  { to: "/contato", label: "Contato" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { user, isStaff } = useAuth();
  const areaHref = user ? (isStaff ? "/admin" : "/aluno") : "/aluno/login";
  const logo = useSiteIdentity().logo_url || defaultLogo;


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-smooth ${
        scrolled || open ? "bg-background/95 backdrop-blur shadow-card-soft" : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src={logo}
            alt="Multplick Formação Profissional"
            className="h-14 md:h-16 w-auto transition-smooth drop-shadow-sm"
          />
        </Link>
        <nav className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition-smooth hover:text-primary-glow ${
                  isActive ? "text-primary" : scrolled ? "text-foreground" : "text-foreground"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={areaHref}>
              <GraduationCap className="size-4" /> Meus Cursos
            </Link>
          </Button>
          <Button asChild variant="hero" size="sm">
            <Link to="/empresas">Convênio Empresarial</Link>
          </Button>
        </div>
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t bg-background">
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} className="py-2 text-foreground font-medium">
                {l.label}
              </NavLink>
            ))}
            <Button asChild variant="outline" className="mt-2">
              <Link to={areaHref}>
                <GraduationCap className="size-4" /> Meus Cursos
              </Link>
            </Button>
            <Button asChild variant="hero" className="mt-2">
              <Link to="/empresas">Convênio Empresarial</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};